const firestoreService = require('../services/firestoreService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/**
 * Generate an access token (short-lived) + refresh token (long-lived).
 * Payload contains only non-sensitive fields needed by middleware.
 */
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, phone: user.phone, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    return { accessToken, refreshToken };
};

/**
 * Build a safe user object — strips internal/security fields before returning to client.
 */
const safeUser = (user) => {
    const s = { ...user };
    delete s.password_hash;
    delete s.refresh_token;
    return s;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the string looks like an email address. */
const isEmail = (identifier) => identifier.includes('@');

/**
 * Very general phone plausibility check:
 * 7–15 digits, optionally prefixed by + and country code digits.
 */
const isPlausiblePhone = (phone) => /^\+?[\d\s\-().]{7,20}$/.test(phone);

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
exports.register = async (req, res) => {
    try {
        const {
            role,
            name,
            phone,
            email,
            password,
            confirmPassword,
            dob,
            gender,
            blood_group,
            specialization,
            hospital_name,
            // Any other profile fields the frontend sends are spread below
        } = req.body;

        // --- Required fields ---
        if (!role || !name || !password || !confirmPassword) {
            return res.status(400).json({ error: 'role, name, password, and confirmPassword are required.' });
        }

        if (!phone && !email) {
            return res.status(400).json({ error: 'At least one of phone or email is required.' });
        }

        // --- Password rules ---
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        // --- Phone / email format ---
        if (phone && !isPlausiblePhone(phone)) {
            return res.status(400).json({ error: 'Phone number format is not valid.' });
        }
        if (email && !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Email address format is not valid.' });
        }

        // --- Duplicate check ---
        if (phone) {
            const existing = await firestoreService.getUserByPhone(phone);
            if (existing) {
                return res.status(409).json({ error: 'An account with this phone number already exists.' });
            }
        }
        if (email) {
            const existing = await firestoreService.getUserByEmail(email);
            if (existing) {
                return res.status(409).json({ error: 'An account with this email address already exists.' });
            }
        }

        // --- Hash password (never log/store plaintext) ---
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // --- Build user data ---
        // Start from req.body so any extra profile fields come through,
        // then overwrite with validated/derived values.
        const userData = {
            ...req.body,
            // Overwrite with clean values
            role: role || 'patient',
            name,
            phone: phone || null,
            email: email || null,
            dob: dob || null,
            gender: gender || null,
            blood_group: blood_group || null,
            password_hash,
        };

        // Strip fields that must never be stored as-is
        delete userData.password;
        delete userData.confirmPassword;
        delete userData.firebaseToken;

        // Doctor-specific defaults
        if (role === 'doctor') {
            userData.specialization = specialization || 'General Physician';
            userData.hospital_name = hospital_name || 'HealthNexus Clinic';
            userData.doctor_qr_id = req.body.doctor_qr_id || ('DOC-' + Math.random().toString(36).substr(2, 6).toUpperCase());
        }

        const userId = uuidv4();
        const user = await firestoreService.createUser(userId, userData);

        const tokens = generateTokens(user);
        await firestoreService.updateUser(user.id, { refresh_token: tokens.refreshToken });

        console.log(`[AUTH] Registered: ${userId} (${role})`);

        return res.status(201).json({
            message: 'Registration Successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: safeUser(user)
        });

    } catch (err) {
        console.error('[ERROR] Registration Error:', err);
        return res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'identifier and password are required.' });
        }

        // Detect phone vs email
        let user;
        if (isEmail(identifier)) {
            user = await firestoreService.getUserByEmail(identifier.toLowerCase().trim());
        } else {
            user = await firestoreService.getUserByPhone(identifier.trim());
        }

        // Generic error — never reveal whether the identifier exists
        const GENERIC_ERROR = 'Invalid credentials.';

        if (!user) {
            return res.status(401).json({ error: GENERIC_ERROR });
        }

        if (!user.password_hash) {
            return res.status(401).json({ error: GENERIC_ERROR });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: GENERIC_ERROR });
        }

        const tokens = generateTokens(user);
        await firestoreService.updateUser(user.id, { refresh_token: tokens.refreshToken });

        console.log(`[AUTH] Login: ${user.id} (${user.role})`);

        return res.json({
            message: 'Login Successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: safeUser(user)
        });

    } catch (err) {
        console.error('[ERROR] Login Error:', err);
        return res.status(500).json({ error: 'Login failed: ' + err.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required.' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await firestoreService.getUser(decoded.id);

        if (!user || user.refresh_token !== refreshToken) {
            return res.status(403).json({ error: 'Invalid refresh token.' });
        }

        const tokens = generateTokens(user);
        await firestoreService.updateUser(user.id, { refresh_token: tokens.refreshToken });

        return res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });

    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me  (requires auth middleware)
// ---------------------------------------------------------------------------
exports.getMe = async (req, res) => {
    try {
        const user = await firestoreService.getUser(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        return res.json(safeUser(user));

    } catch (err) {
        console.error('[ERROR] getMe:', err);
        return res.status(500).json({ error: 'Failed to fetch user data.' });
    }
};
