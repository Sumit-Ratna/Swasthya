/**
 * seedDemoUsers.js
 *
 * Creates or updates three demo accounts in Firestore so developers
 * always have working credentials locally.
 *
 * Demo Credentials (password: Demo@1234)
 * ──────────────────────────────────────
 * Doctor  : phone +19998887777  /  email doctor@demo.com
 * Patient1: phone +19998887778  /  email patient1@demo.com
 * Patient2: phone +19998887779  /  email patient2@demo.com
 *
 * Usage:
 *   node backend/src/scripts/seedDemoUsers.js
 *   (or)  npm run seed   (from the backend directory)
 *
 * This script is NEVER called on server start.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
// Also try backend-level .env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// We need firebase-admin initialised before importing the service
require('../config/firebaseAdmin');
const firestoreService = require('../services/firestoreService');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const DEMO_PASSWORD = 'Demo@1234';

const demoUsers = [
    {
        role: 'doctor',
        name: 'Dr. Demo Doctor',
        phone: '+19998887777',
        email: 'doctor@demo.com',
        specialization: 'General Physician',
        hospital_name: 'HealthNexus Demo Clinic',
        gender: 'Male',
        dob: '1985-06-15',
        doctor_qr_id: 'DOC-DEMO01'
    },
    {
        role: 'patient',
        name: 'Demo Patient One',
        phone: '+19998887778',
        email: 'patient1@demo.com',
        gender: 'Female',
        dob: '1992-03-22',
        blood_group: 'O+'
    },
    {
        role: 'patient',
        name: 'Demo Patient Two',
        phone: '+19998887779',
        email: 'patient2@demo.com',
        gender: 'Male',
        dob: '1988-11-10',
        blood_group: 'A+'
    }
];

async function seed() {
    if (!firestoreService.db) {
        console.error('[SEED] Firestore not initialized. Make sure service-account.json exists.');
        process.exit(1);
    }

    console.log(`[SEED] Hashing password with ${SALT_ROUNDS} rounds...`);
    const password_hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    for (const demo of demoUsers) {
        // Check if user with this phone already exists
        let existing = null;
        if (demo.phone) {
            existing = await firestoreService.getUserByPhone(demo.phone);
        }
        if (!existing && demo.email) {
            existing = await firestoreService.getUserByEmail(demo.email);
        }

        if (existing) {
            // Update password hash on existing record
            await firestoreService.updateUser(existing.id, { password_hash });
            console.log(`[SEED] Updated: ${demo.name} (${existing.id}) — password refreshed`);
        } else {
            const userId = uuidv4();
            await firestoreService.createUser(userId, {
                ...demo,
                password_hash
            });
            console.log(`[SEED] Created: ${demo.name} (${userId})`);
        }
    }

    console.log('\n[SEED] Done. Demo credentials:');
    console.log('  Password for all:   Demo@1234');
    for (const u of demoUsers) {
        console.log(`  ${u.role.padEnd(8)} phone: ${u.phone}   email: ${u.email}`);
    }

    process.exit(0);
}

seed().catch(err => {
    console.error('[SEED] Fatal error:', err);
    process.exit(1);
});
