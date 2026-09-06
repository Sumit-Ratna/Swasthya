const { bucket } = require('../config/firebaseAdmin');

/**
 * Uploads an in-memory Buffer to Firebase Storage.
 *
 * @param {Buffer} buffer - The file buffer in memory
 * @param {string} destinationPath - Path inside the bucket (e.g. 'documents/filename.pdf')
 * @param {string} mimetype - File MIME type (e.g. 'application/pdf', 'image/jpeg')
 * @returns {Promise<string>} The public or accessible URL of the uploaded file
 */
async function uploadBuffer(buffer, destinationPath, mimetype = 'application/octet-stream') {
    if (!bucket) {
        console.warn('[STORAGE] Firebase Storage bucket not configured. Generating inline data URI fallback.');
        const base64 = buffer.toString('base64');
        return `data:${mimetype};base64,${base64}`;
    }

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
}

/**
 * Deletes a file from Firebase Storage if it exists.
 *
 * @param {string} fileUrl - The file URL to remove
 */
async function deleteFile(fileUrl) {
    if (!bucket || !fileUrl || fileUrl.startsWith('data:')) return;

    try {
        // Extract object name if it matches googleapis URL
        let objectName = null;
        if (fileUrl.includes(bucket.name)) {
            const parts = fileUrl.split(`${bucket.name}/`);
            if (parts.length > 1) {
                objectName = decodeURIComponent(parts[1].split('?')[0]);
            }
        }

        if (objectName) {
            await bucket.file(objectName).delete({ ignoreNotFound: true });
            console.log(`[STORAGE] Deleted file: ${objectName}`);
        }
    } catch (err) {
        console.warn('[STORAGE] Failed to delete file from storage:', err.message);
    }
}

module.exports = {
    uploadBuffer,
    deleteFile
};
