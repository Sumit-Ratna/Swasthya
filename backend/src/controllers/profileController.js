const firestoreService = require('../services/firestoreService');

// Update User Profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { section, data } = req.body;

        console.log(`[UPDATE] Updating ${section} profile for user ${userId}`);

        let updates = {};
        if (section === 'personal' || !section) {
            updates = { ...(data || req.body) };
        } else if (section === 'medical') {
            updates = { medical_history: data };
        } else if (section === 'lifestyle') {
            updates = { lifestyle: data };
        }

        // Don't allow updating security-sensitive fields via profile endpoint
        delete updates.id;
        delete updates.phone;
        delete updates.role;
        delete updates.refresh_token;
        delete updates.password_hash;
        delete updates.section;

        await firestoreService.updateUser(userId, updates);
        const updatedUser = await firestoreService.getUser(userId);

        // Strip sensitive fields before returning
        const safeUpdated = { ...updatedUser };
        delete safeUpdated.password_hash;
        delete safeUpdated.refresh_token;

        res.json({
            message: 'Profile updated successfully',
            user: safeUpdated
        });

    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get User Profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await firestoreService.getUser(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const safeUser = { ...user };
        delete safeUser.password_hash;
        delete safeUser.refresh_token;

        res.json(safeUser);
    } catch (err) {
        console.error('Get Profile Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete User Profile
exports.deleteProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[DELETE] Deleting account for user ${userId}`);

        await firestoreService.deleteUser(userId);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error('Delete Profile Error:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
