const firestoreService = require('../services/firestoreService');
const aiService = require('../services/aiService');
const storageService = require('../services/storageService');
const { randomUUID: uuidv4 } = require('crypto');

exports.uploadReport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { patient_id, analyze } = req.body;
        const shouldAnalyze = analyze === 'true' || analyze === true;

        console.log(`[STORAGE] Uploading document to Storage for patient: ${patient_id}${shouldAnalyze ? ' with AI analysis' : ''}`);

        // Generate unique storage path and upload buffer
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = (req.file.originalname || 'document').replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `documents/${patient_id}/${uniqueSuffix}-${cleanName}`;

        const fileUrl = await storageService.uploadBuffer(req.file.buffer, storagePath, req.file.mimetype);

        let initialData = {};
        let sharedWith = [];
        let isShared = false;

        console.log("[DEBUG] Upload Request User:", req.user);
        console.log("[DEBUG] Upload Request Body:", req.body);

        // Determine if uploader is doctor
        let isDoctor = false;
        let doctorId = null;

        if (req.user && req.user.role === 'doctor' && req.user.id) {
            isDoctor = true;
            doctorId = req.user.id;
        } else if (req.body.is_doctor_upload === 'true' && req.body.doctor_id) {
            console.log("[WARNING] Using FormData fallback for doctor identification");
            isDoctor = true;
            doctorId = req.body.doctor_id;
        }

        if (isDoctor && doctorId) {
            console.log("[SUCCESS] Doctor detected. Setting ownership and sharing.");
            initialData.doctor_id = doctorId;
            initialData.uploaded_by = 'doctor';
            sharedWith = [doctorId];
            isShared = true;
        } else {
            // Patient upload: check if patient has connected doctors and auto-share
            try {
                const connectedDoctors = await firestoreService.getDoctorsByPatient(patient_id);
                if (connectedDoctors && connectedDoctors.length > 0) {
                    sharedWith = connectedDoctors.map(d => String(d.id));
                    isShared = true;
                    console.log(`[STORAGE] Auto-shared report with ${sharedWith.length} connected doctor(s)`);
                }
            } catch (linkErr) {
                console.warn('[STORAGE] Could not auto-fetch connected doctors for sharing:', linkErr.message);
            }
        }

        const newDoc = await firestoreService.createDocument({
            patient_id,
            type: 'lab_report',
            file_url: fileUrl,
            extracted_data: initialData,
            summary: "Uploaded Report",
            is_shared: isShared,
            shared_with: sharedWith
        });

        console.log("[SUCCESS] Document created in Firestore:", newDoc.id);

        if (!shouldAnalyze) {
            return res.json({
                message: "Report Uploaded Successfully",
                document: newDoc
            });
        }

        // AI Analysis
        try {
            const imageBuffer = req.file.buffer;
            console.log("[AI] Analyzing file with Gemini...");
            const aiResponse = await aiService.analyzeLabReport(imageBuffer, req.file.mimetype);

            let extractedData = aiResponse;
            if (typeof extractedData === 'string') {
                try {
                    const jsonStr = extractedData.replace(/```json/g, '').replace(/```/g, '').trim();
                    extractedData = JSON.parse(jsonStr);
                } catch (e) {
                    extractedData = { summary_text: extractedData };
                }
            }

            const safetyData = { ...initialData, ...extractedData };

            await firestoreService.updateDocument(newDoc.id, {
                extracted_data: safetyData,
                summary: "AI Analyzed Report"
            });

            res.json({
                message: "Report Analyzed & Saved Successfully",
                document: { ...newDoc, extracted_data: safetyData },
                analysis: extractedData
            });
        } catch (aiErr) {
            console.error("[AI] AI Analysis Failed:", aiErr.message);
            res.json({
                message: "Report Uploaded, but AI Analysis Failed (Quota exceeded)",
                document: newDoc,
                error: aiErr.message
            });
        }

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;

        const docs = await firestoreService.getDocumentsByPatient(patient_id);

        let visibleDocs = docs.filter(doc =>
            doc.extracted_data?.hidden_for_patient !== 'true'
        );

        if (role === 'doctor') {
            const link = await firestoreService.getDoctorPatientLink(userId, patient_id);
            visibleDocs = visibleDocs.filter(doc => {
                const sharedWith = (doc.shared_with || []).map(String);
                const isCreator = String(doc.extracted_data?.doctor_id || '') === String(userId);
                const isExplicitlyShared = sharedWith.includes(String(userId));
                return isCreator || isExplicitlyShared || Boolean(link);
            });
        } else if (role === 'patient' && String(patient_id) !== String(userId)) {
            // Check family link (bidirectional)
            let link = await firestoreService.getFamilyLink(userId, patient_id);
            if (!link) {
                link = await firestoreService.getFamilyLink(patient_id, userId);
            }
            if (!link || link.status !== 'active') {
                return res.status(403).json({ error: "Unauthorized access to patient documents" });
            }

            // Enforce permissions granted by patient_id to viewer (userId)
            const permissions = link.permissions || {};
            const patientPerm = permissions[patient_id] || { access_level: 'full', allowed_document_ids: [] };
            const accessLevel = patientPerm.access_level || 'full';

            if (accessLevel === 'none') {
                visibleDocs = [];
            } else if (accessLevel === 'selected') {
                const allowedSet = new Set(patientPerm.allowed_document_ids || []);
                visibleDocs = visibleDocs.filter(doc => allowedSet.has(doc.id));
            }
        }

        res.json(visibleDocs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSharing = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctor_ids } = req.body;

        const doc = await firestoreService.getDocument(id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        let updateData = {};
        if (Array.isArray(doctor_ids)) {
            updateData.shared_with = doctor_ids;
            updateData.is_shared = doctor_ids.length > 0;
        } else {
            updateData.is_shared = !doc.is_shared;
            if (!updateData.is_shared) updateData.shared_with = [];
        }

        await firestoreService.updateDocument(id, updateData);

        res.json({
            message: "Sharing settings updated",
            is_shared: updateData.is_shared,
            shared_with: updateData.shared_with
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;
        const document = await firestoreService.getDocument(id);

        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        if (role === 'doctor') {
            const isCreator = document.extracted_data?.doctor_id === userId;
            const sharedWith = document.shared_with || [];

            if (isCreator) {
                await firestoreService.deleteDocument(id);
                await storageService.deleteFile(document.file_url);
                return res.json({ message: "Document permanently deleted by doctor" });
            } else if (sharedWith.includes(userId)) {
                const updatedShared = sharedWith.filter(docId => docId !== userId);
                await firestoreService.updateDocument(id, {
                    shared_with: updatedShared,
                    is_shared: updatedShared.length > 0
                });
                return res.json({ message: "Access removed. Document unshared from your portal." });
            } else {
                return res.status(403).json({ error: "You are not authorized to delete this document" });
            }
        }

        if (document.patient_id !== userId) {
            return res.status(403).json({ error: "Unauthorized to delete this document" });
        }

        const isCreatedByDoctor = document.extracted_data?.doctor_id || document.type === 'prescription';
        const isSharedWithDoctors = (document.shared_with && document.shared_with.length > 0) || document.is_shared;

        if (isCreatedByDoctor || isSharedWithDoctors) {
            const currentExtracted = document.extracted_data || {};
            await firestoreService.updateDocument(id, {
                extracted_data: { ...currentExtracted, hidden_for_patient: "true" }
            });
            res.json({ message: "Document removed from your health records." });
        } else {
            await firestoreService.deleteDocument(id);
            await storageService.deleteFile(document.file_url);
            res.json({ message: "Personal document permanently deleted." });
        }
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.analyzeDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;

        const document = await firestoreService.getDocument(id);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Authorization check: patient owner, shared doctor, or connected doctor
        let canAccess = (document.patient_id === userId);
        if (!canAccess && role === 'doctor') {
            const isCreator = String(document.extracted_data?.doctor_id || '') === String(userId);
            const isShared = document.shared_with && document.shared_with.map(String).includes(String(userId));
            const isLinked = await firestoreService.getDoctorPatientLink(userId, document.patient_id);
            canAccess = isCreator || isShared || Boolean(isLinked);
        }

        if (!canAccess) {
            return res.status(403).json({ error: "Access denied to analyze this document" });
        }

        if (!document.file_url) {
            return res.status(400).json({ error: "No file attached to this document" });
        }

        console.log(`[AI] Analyzing existing document ${id} for user ${userId}`);

        let fileBuffer;
        let mimeType = 'image/jpeg';

        if (document.file_url.startsWith('data:')) {
            const matches = document.file_url.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                fileBuffer = Buffer.from(matches[2], 'base64');
            } else {
                fileBuffer = Buffer.from(document.file_url.split(',')[1] || '', 'base64');
            }
        } else if (document.file_url.includes('/api/documents/raw/')) {
            // Direct retrieval from storageService to avoid network/port loopbacks
            const match = document.file_url.match(/\/api\/documents\/raw\/([^\/\?#]+)/);
            if (match) {
                const rawFile = await storageService.getFile(match[1]);
                if (rawFile) {
                    fileBuffer = rawFile.buffer;
                    mimeType = rawFile.mimetype;
                }
            }
        }

        if (!fileBuffer) {
            let fetchUrl = document.file_url;
            if (fetchUrl.includes('localhost:') || fetchUrl.includes('127.0.0.1:')) {
                const port = process.env.PORT || 8000;
                fetchUrl = fetchUrl.replace(/https?:\/\/[^\/]+/, `http://localhost:${port}`);
            }
            const fetchRes = await fetch(fetchUrl);
            if (!fetchRes.ok) {
                return res.status(404).json({ error: "Unable to retrieve file from storage" });
            }
            const arrayBuffer = await fetchRes.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
            mimeType = fetchRes.headers.get('content-type') || 'application/pdf';
        }

        const aiResponse = await aiService.analyzeLabReport(fileBuffer, mimeType);

        let extractedData = aiResponse;
        if (typeof extractedData === 'string') {
            try {
                const jsonStr = extractedData.replace(/```json/g, '').replace(/```/g, '').trim();
                extractedData = JSON.parse(jsonStr);
            } catch (e) {
                extractedData = { summary_text: extractedData };
            }
        }

        const oldData = document.extracted_data || {};
        const safeData = { ...oldData, ...extractedData };

        await firestoreService.updateDocument(id, {
            extracted_data: safeData,
            summary: "AI Analyzed Report"
        });

        res.json({
            message: "Analysis Complete",
            document: { ...document, extracted_data: safeData },
            analysis: safeData
        });

    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getRawFile = async (req, res) => {
    try {
        const { id } = req.params;
        const fileData = await storageService.getFile(id);
        if (!fileData) {
            return res.status(404).json({ error: "File not found" });
        }
        res.setHeader('Content-Type', fileData.mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(req.params.filename || fileData.fileName || 'file')}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(fileData.buffer);
    } catch (err) {
        console.error("Get raw file error:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;

