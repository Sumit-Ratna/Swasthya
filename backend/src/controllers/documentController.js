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
            visibleDocs = visibleDocs.filter(doc => {
                const sharedWith = doc.shared_with || [];
                const isCreator = doc.extracted_data?.doctor_id === userId;
                return sharedWith.includes(userId) || isCreator;
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
        const document = await firestoreService.getDocument(id);
        const userId = req.user?.id;
        let role = req.user?.role;

        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Get user if role is missing
        if (userId && !role) {
            const userRec = await firestoreService.getUser(userId);
            if (userRec) {
                role = userRec.role;
                console.log(`[SYNC] Role restored from DB: ${role}`);
            } else {
                return res.status(401).json({ error: "Session invalid. Please log out and log in again." });
            }
        }

        // DOCTOR DELETION LOGIC
        if (role === 'doctor') {
            const data = document.extracted_data || {};
            const isDoctorCreated = data.uploaded_by === 'doctor' ||
                String(data.doctor_id) === String(userId) ||
                document.type === 'prescription' ||
                document.type === 'diagnosis_note';

            // Case: Doctor created this report -> Delete permanently for everyone
            if (isDoctorCreated) {
                console.log(`[DELETE] Doctor ${userId} deleting OWN record ${id}. Permanent delete.`);
                if (document.file_url) {
                    await storageService.deleteFile(document.file_url);
                }
                await firestoreService.deleteDocument(id);
                return res.json({ message: "Record deleted permanently from all systems." });
            }

            // Case: Patient report shared with doctor -> Only remove sharing (Keep for patient)
            let sharedWith = document.shared_with || [];
            if (sharedWith.includes(userId)) {
                console.log(`[DELETE] Doctor ${userId} removing shared access to patient record ${id}.`);
                sharedWith = sharedWith.filter(dId => dId !== userId);
                await firestoreService.updateDocument(id, {
                    shared_with: sharedWith,
                    is_shared: sharedWith.length > 0
                });
                return res.json({ message: "Access removed. The report remains in the patient's records." });
            }

            return res.status(403).json({ error: "Permission Denied. You can only delete your own records or remove shared access." });
        }

        // PATIENT DELETION LOGIC
        if (role === 'patient') {
            if (String(document.patient_id) !== String(userId)) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            const data = document.extracted_data || {};
            const isDoctorCreated = data.uploaded_by === 'doctor' ||
                data.doctor_id ||
                document.type === 'prescription' ||
                document.type === 'diagnosis_note';

            // Case: Patient deleting a Doctor-generated report -> Soft delete (Keep for doctor)
            if (isDoctorCreated) {
                console.log(`[DELETE] Patient ${userId} deleting doctor-generated record ${id}. Soft deleting.`);
                const newData = { ...data, hidden_for_patient: "true" };
                await firestoreService.updateDocument(id, { extracted_data: newData });
                return res.json({ message: "Report removed from your view. It remains in the clinic's records." });
            }

            // Case: Patient deleting their OWN upload -> Permanent delete
            console.log(`[DELETE] Patient ${userId} deleting their OWN upload ${id}. Permanent delete.`);
            if (document.file_url) {
                await storageService.deleteFile(document.file_url);
            }
            await firestoreService.deleteDocument(id);
            return res.json({ message: "Record deleted permanently." });
        }

        return res.status(403).json({ error: `Unauthorized (Status: ${role || 'No Role'})` });
    } catch (err) {
        console.error("Delete document error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.analyzeDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await firestoreService.getDocument(id);

        if (!document) return res.status(404).json({ error: "Document not found" });

        const userId = req.user?.id;
        const role = req.user?.role;

        let canAccess = false;
        if (role === 'patient') {
            if (String(document.patient_id) === String(userId)) {
                canAccess = true;
            } else {
                let link = await firestoreService.getFamilyLink(userId, document.patient_id);
                if (!link) link = await firestoreService.getFamilyLink(document.patient_id, userId);
                if (link && link.status === 'active') {
                    const permissions = link.permissions || {};
                    const patientPerm = permissions[document.patient_id] || { access_level: 'full', allowed_document_ids: [] };
                    const accessLevel = patientPerm.access_level || 'full';
                    if (accessLevel === 'full') {
                        canAccess = true;
                    } else if (accessLevel === 'selected' && patientPerm.allowed_document_ids?.includes(document.id)) {
                        canAccess = true;
                    }
                }
            }
        }
        if (role === 'doctor') {
            const sharedWith = document.shared_with || [];
            if (sharedWith.includes(userId)) canAccess = true;
            if (document.extracted_data && document.extracted_data.doctor_id == userId) canAccess = true;
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
        } else {
            const fetchRes = await fetch(document.file_url);
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
        res.send(fileData.buffer);
    } catch (err) {
        console.error("Get raw file error:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;

