const { bucket, db } = require('../config/firebaseAdmin');
const { randomUUID: uuidv4 } = require('crypto');
const path = require('path');

// In-memory cache for blobs when cloud storage bucket is not yet enabled
const memoryBlobCache = new Map();

/**
 * Uploads an in-memory Buffer to Firebase Storage, with resilient fallback
 * if the Firebase Storage bucket does not exist yet in Google Cloud.
 *
 * @param {Buffer} buffer - The file buffer in memory
 * @param {string} destinationPath - Path inside the bucket (e.g. 'documents/filename.pdf')
 * @param {string} mimetype - File MIME type (e.g. 'application/pdf', 'image/jpeg')
 * @returns {Promise<string>} The accessible URL of the uploaded file
 */
async function uploadBuffer(buffer, destinationPath, mimetype = 'application/octet-stream') {
    // 1. If Firebase Storage bucket is available, attempt primary upload to Google Cloud Storage
    if (bucket) {
        try {
            const file = bucket.file(destinationPath);

            await file.save(buffer, {
                metadata: {
                    contentType: mimetype
                },
                resumable: false
            });

            // Try making file publicly readable; fallback to signed URL if uniform bucket-level access is enabled
            try {
                await file.makePublic();
                return file.publicUrl();
            } catch (pubErr) {
                console.log('[STORAGE] makePublic unavailable, generating long-lived signed URL...');
                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 year
                });
                return signedUrl;
            }
        } catch (saveErr) {
            console.warn(`[STORAGE] Firebase Storage upload attempt failed (${saveErr.message}). Using resilient fallback storage.`);
        }
    }

    // 2. Resilient Fallback Storage (zero local uploads folder)
    // Used when Firebase Storage bucket is not created/enabled yet in the Firebase Console.
    const blobId = uuidv4();
    const cleanFileName = path.basename(destinationPath) || 'document';

    memoryBlobCache.set(blobId, {
        buffer,
        mimetype,
        fileName: cleanFileName,
        createdAt: Date.now()
    });

    // If Firestore is available and blob fits in a Firestore doc (< 850KB), persist it for durability across restarts
    if (db && buffer.length <= 850 * 1024) {
        try {
            await db.collection('storage_blobs').doc(blobId).set({
                base64: buffer.toString('base64'),
                mimetype,
                fileName: cleanFileName,
                createdAt: new Date().toISOString()
            });
        } catch (dbErr) {
            console.warn('[STORAGE] Could not persist blob to Firestore cache:', dbErr.message);
        }
    }

    const port = process.env.PORT || 8000;
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
    return `${baseUrl}/api/documents/raw/${blobId}/${encodeURIComponent(cleanFileName)}`;
}

/**
 * Retrieves a stored blob by ID from memory cache or Firestore fallback.
 *
 * @param {string} blobId
 * @returns {Promise<{ buffer: Buffer, mimetype: string, fileName: string }|null>}
 */
async function getFile(blobId) {
    if (memoryBlobCache.has(blobId)) {
        return memoryBlobCache.get(blobId);
    }

    if (db) {
        try {
            const doc = await db.collection('storage_blobs').doc(blobId).get();
            if (doc.exists) {
                const data = doc.data();
                const buffer = Buffer.from(data.base64, 'base64');
                const item = {
                    buffer,
                    mimetype: data.mimetype || 'application/octet-stream',
                    fileName: data.fileName || 'file'
                };
                memoryBlobCache.set(blobId, item);
                return item;
            }
        } catch (err) {
            console.warn('[STORAGE] Error fetching blob from Firestore:', err.message);
        }
    }

    return null;
}

/**
 * Deletes a file from Firebase Storage or fallback storage.
 *
 * @param {string} fileUrl - The file URL to remove
 */
async function deleteFile(fileUrl) {
    if (!fileUrl) return;

    // Check if it's a fallback URL
    if (fileUrl.includes('/api/documents/raw/')) {
        const match = fileUrl.match(/\/api\/documents\/raw\/([^\/\?#]+)/);
        if (match) {
            const blobId = match[1];
            memoryBlobCache.delete(blobId);
            if (db) {
                try {
                    await db.collection('storage_blobs').doc(blobId).delete();
                    console.log(`[STORAGE] Deleted blob: ${blobId}`);
                } catch (err) {
                    console.warn('[STORAGE] Failed to delete blob from Firestore:', err.message);
                }
            }
        }
        return;
    }

    if (!bucket || fileUrl.startsWith('data:')) return;

    try {
        let objectName = null;
        if (fileUrl.includes(bucket.name)) {
            const parts = fileUrl.split(`${bucket.name}/`);
            if (parts > 1) {
                objectName = decodeURIComponent(parts[1].split('?')[0]);
            }
        }

        if (objectName) {
            await bucket.file(objectName).delete({ ignoreNotFound: true });
            console.log(`[STORAGE] Deleted file from Firebase Storage: ${objectName}`);
        }
    } catch (err) {
        console.warn('[STORAGE] Failed to delete file from Firebase Storage:', err.message);
    }
}

module.exports = {
    uploadBuffer,
    getFile,
    deleteFile
};

