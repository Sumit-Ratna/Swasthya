const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const serviceAccountPath = path.join(__dirname, '../../service-account.json');

try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            raw = raw.slice(1, -1).trim();
        }
        try {
            serviceAccount = JSON.parse(raw);
        } catch {
            try {
                const decoded = Buffer.from(raw, 'base64').toString('utf8');
                serviceAccount = JSON.parse(decoded);
            } catch (b64Err) {
                console.error("[ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON or Base64:", b64Err.message);
            }
        }
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID || 'medical-ab63c',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
    } else if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
    }

    if (serviceAccount && !admin.apps.length) {
        const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || (serviceAccount.project_id ? `${serviceAccount.project_id}.firebasestorage.app` : undefined);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket
        });
        console.log("[FIREBASE] Admin SDK initialized successfully");
    } else if (!serviceAccount) {
        console.warn("[WARNING] service-account.json not found and FIREBASE_SERVICE_ACCOUNT env var not provided/invalid");
    }
} catch (error) {
    console.error("[ERROR] Firebase Admin initialization failed:", error.message);
}

const db = admin.apps.length ? admin.firestore() : null;
let bucket = null;
if (admin.apps.length) {
    try {
        bucket = process.env.FIREBASE_STORAGE_BUCKET
            ? admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET)
            : admin.storage().bucket();
    } catch (err) {
        console.warn("[WARNING] Could not initialize Firebase Storage bucket:", err.message);
    }
}

module.exports = { admin, db, bucket };
