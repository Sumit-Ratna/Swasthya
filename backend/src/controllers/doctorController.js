const firestoreService = require('../services/firestoreService');
const aiService = require('../services/aiService');

// Get Doctor Dashboard Stats
exports.getDashboard = async (req, res) => {
    try {
        console.log(`[DATABASE] Getting dashboard for doctor: ${req.user.id}`);

        const patients = await firestoreService.getPatientsByDoctor(req.user.id);
        const patientCount = patients.length;

        const appointments = await firestoreService.getAppointmentsByDoctor(req.user.id);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointments.filter(apt =>
            apt.appointment_date?.startsWith(today)
        ).length;

        // Get recent documents created or shared with this doctor
        const allDocs = await firestoreService.db.collection('documents')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const recentActivity = [];
        for (const doc of allDocs.docs) {
            const data = { id: doc.id, ...doc.data() };
            const doctorId = String(req.user.id);

            // Check if doctor created it or it's shared with them
            const isCreator = data.extracted_data?.doctor_id === doctorId;
            const isShared = data.shared_with?.includes(doctorId);

            if (isCreator || isShared) {
                // Get patient info
                const patient = await firestoreService.getUser(data.patient_id);
                recentActivity.push({
                    ...data,
                    patient: patient ? {
                        id: patient.id,
                        name: patient.name,
                        phone: patient.phone
                    } : null
                });

                if (recentActivity.length >= 12) break;
            }
        }

        console.log(`[DATABASE] Dashboard for ${req.user.id}: Found ${recentActivity.length} recent activity items`);

        res.json({
            patientCount,
            todayAppointments,
            recentActivity,
            message: "Dashboard loaded"
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get Doctor's Patients
exports.getMyPatients = async (req, res) => {
    try {
        const patients = await firestoreService.getPatientsByDoctor(req.user.id);
        res.json(patients);
    } catch (err) {
        console.error("Get patients error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get Patient History
exports.getPatientHistory = async (req, res) => {
    try {
        const { patient_id } = req.params;

        // Verify connection
        const link = await firestoreService.getDoctorPatientLink(req.user.id, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await firestoreService.getUser(patient_id);
        const documents = await firestoreService.getDocumentsByPatient(patient_id);
        const appointments = await firestoreService.getAppointmentsByPatient(patient_id);

        res.json({
            patient,
            documents,
            appointments
        });
    } catch (err) {
        console.error("Get patient history error:", err);
        res.status(500).json({ error: err.message });
    }
};

const pdfService = require('../services/pdfService');
const path = require('path');
const fs = require('fs');

// Prescribe Medicine
exports.prescribeMedicine = async (req, res) => {
    try {
        const { patient_id, medicines, instructions, diagnosis } = req.body;
        const doctorId = req.user.id;

        console.log(`[PRESCRIPTION] Prescribing for patient: ${patient_id} by doctor: ${doctorId}`);

        // Verify connection
        const link = await firestoreService.getDoctorPatientLink(doctorId, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await firestoreService.getUser(patient_id);
        if (!patient) return res.status(404).json({ error: "Patient not found for prescription" });

        // Fetch full doctor profile to ensure we have name/hospital
        const doctor = await firestoreService.getUser(doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

        // Generate unique filename for PDF
        const fileName = `Prescription-${Date.now()}-${patient_id.substring(0, 6)}.pdf`;
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);

        // Prepare data for PDF
        const pdfData = {
            hospitalName: doctor.hospital_name || 'HealthNexus Clinic',
            doctorName: doctor.name || 'Doctor',
            doctorSpecialization: doctor.specialization || 'General Physician',
            patientName: patient.name || 'Patient',
            patientAge: patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A',
            patientGender: patient.gender || 'N/A',
            patientPhone: patient.phone || 'N/A',
            visitId: Date.now().toString(),
            symptoms: '', // Can be added if passed
            diagnosis: diagnosis || 'General Consultation',
            medicines: medicines || [],
            notes: instructions || ''
        };

        // Generate PDF
        await pdfService.generatePrescriptionPDF(pdfData, filePath);

        const prescriptionData = {
            medicines: medicines || [],
            instructions: instructions || '',
            diagnosis: diagnosis || '',
            doctor_id: doctorId,
            prescribed_date: new Date().toISOString()
        };

        const newDoc = await firestoreService.createDocument({
            patient_id,
            type: 'prescription',
            extracted_data: prescriptionData,
            summary: `Prescription by Dr. ${doctor.name || 'Doctor'}`,
            is_shared: true,
            shared_with: [doctorId],
            file_url: 'uploads/' + fileName // Attach generated PDF
        });

        res.json({
            message: "Prescription created successfully",
            document: newDoc,
            // Skip AI check result as we removed AI logic here for speed/simplicity or keep simple
            safetyChecks: []
        });
    } catch (err) {
        console.error("Prescribe error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Add Diagnosis Note
exports.addDiagnosisNote = async (req, res) => {
    try {
        const { patient_id, diagnosis, symptoms, treatment_plan } = req.body;
        const doctorId = req.user.id;

        console.log(`[UPDATE] Adding diagnosis for patient: ${patient_id} by doctor: ${doctorId}`);

        // Verify connection
        const link = await firestoreService.getDoctorPatientLink(doctorId, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const patient = await firestoreService.getUser(patient_id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        // Fetch full doctor profile
        const doctor = await firestoreService.getUser(doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });

        // Generate PDF
        const fileName = `Diagnosis-${Date.now()}-${patient_id.substring(0, 6)}.pdf`;
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);

        const pdfData = {
            hospitalName: doctor.hospital_name || 'HealthNexus Clinic',
            doctorName: doctor.name || 'Doctor',
            doctorSpecialization: doctor.specialization || 'General Physician',
            patientName: patient.name || 'Patient',
            patientAge: patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A',
            patientGender: patient.gender || 'N/A',
            patientPhone: patient.phone || 'N/A',
            visitId: Date.now().toString(),
            symptoms: symptoms || '',
            diagnosis: diagnosis || 'General Diagnosis',
            notes: treatment_plan || ''
        };

        await pdfService.generatePrescriptionPDF(pdfData, filePath);

        const diagnosisData = {
            diagnosis: diagnosis || '',
            symptoms: symptoms || '',
            treatment_plan: treatment_plan || '',
            doctor_id: doctorId,
            diagnosis_date: new Date().toISOString()
        };

        const newDoc = await firestoreService.createDocument({
            patient_id,
            type: 'diagnosis_note',
            extracted_data: diagnosisData,
            summary: `Diagnosis by Dr. ${doctor.name || 'Doctor'}`,
            is_shared: true,
            shared_with: [doctorId],
            file_url: 'uploads/' + fileName
        });

        res.json({
            message: "Diagnosis note created successfully",
            document: newDoc
        });
    } catch (err) {
        console.error("Diagnosis error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const updates = req.body;

        // Don't allow updating sensitive fields
        delete updates.id;
        delete updates.phone;
        delete updates.role;

        await firestoreService.updateUser(req.user.id, updates);
        const updatedUser = await firestoreService.getUser(req.user.id);

        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Update Patient Profile (by Doctor)
exports.updatePatientProfile = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { medical_history, lifestyle } = req.body;
        const doctorId = req.user.id;

        // Verify connection
        const link = await firestoreService.getDoctorPatientLink(doctorId, patient_id);
        if (!link) {
            return res.status(403).json({ error: "Not connected to this patient" });
        }

        const updates = {};
        if (medical_history) updates.medical_history = medical_history;
        if (lifestyle) updates.lifestyle = lifestyle;

        await firestoreService.updateUser(patient_id, updates);
        const updatedPatient = await firestoreService.getUser(patient_id);

        res.json({
            message: "Patient profile updated successfully",
            patient: updatedPatient
        });
    } catch (err) {
        console.error("Update patient profile error:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
