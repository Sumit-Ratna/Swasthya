const admin = require('firebase-admin');

// [WARNING] WARNING: 
// To verify tokens securely, you MUST provide a Service Account JSON file.
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Generate new private key -> Download JSON
// 3. Save it as `service-account.json` in `backend/` folder (DO NOT COMMIT THIS FILE!)
// 4. Update the `serviceAccountPath` below if needed.

const path = require('path');
const fs = require('fs');
const serviceAccountPath = path.join(__dirname, '../../service-account.json');

try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
        }
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
        console.warn("[WARNING] service-account.json not found at:", serviceAccountPath);
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
