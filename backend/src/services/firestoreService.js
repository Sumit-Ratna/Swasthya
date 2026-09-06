const { db } = require('../config/firebaseAdmin');

if (!db) {
    console.error('[WARNING] Firestore is not initialized. Please add service-account.json file.');
}

class FirestoreService {
    constructor() {
        this.db = db;
    }

    // === USER OPERATIONS ===
    async createUser(userId, userData) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('users').doc(userId).set({
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return { id: userId, ...userData };
    }

    async getUser(userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const doc = await this.db.collection('users').doc(userId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async getUserByPhone(phone) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('users')
            .where('phone', '==', phone)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    async getUserByEmail(email) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    async updateUser(userId, data) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('users').doc(userId).update({
            ...data,
            updatedAt: new Date()
        });
        return this.getUser(userId);
    }

    async deleteUser(userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('users').doc(userId).delete();
    }

    // === DOCUMENT OPERATIONS ===
    async createDocument(docData) {
        if (!this.db) throw new Error('Firestore not initialized');
        const docRef = this.db.collection('documents').doc();
        await docRef.set({
            ...docData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return { id: docRef.id, ...docData };
    }

    async getDocument(docId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const doc = await this.db.collection('documents').doc(docId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async getDocumentsByPatient(patientId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('documents')
            .where('patient_id', '==', patientId)
            .get();

        const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore timestamps to ISO strings
            if (data.createdAt && data.createdAt.toDate) {
                data.createdAt = data.createdAt.toDate().toISOString();
            }
            if (data.updatedAt && data.updatedAt.toDate) {
                data.updatedAt = data.updatedAt.toDate().toISOString();
            }
            return { id: doc.id, ...data };
        });

        // Sort in-memory by createdAt descending
        docs.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        return docs;
    }

    async updateDocument(docId, data) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('documents').doc(docId).update({
            ...data,
            updatedAt: new Date()
        });
        return this.getDocument(docId);
    }

    async deleteDocument(docId) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('documents').doc(docId).delete();
    }

    // === DOCTOR-PATIENT LINK OPERATIONS ===
    async createDoctorPatientLink(linkData) {
        if (!this.db) throw new Error('Firestore not initialized');
        const linkRef = this.db.collection('doctorPatientLinks').doc();
        await linkRef.set({
            ...linkData,
            status: linkData.status || 'active',
            linked_at: new Date()
        });
        return { id: linkRef.id, ...linkData };
    }

    async getDoctorPatientLink(doctorId, patientId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('doctorPatientLinks')
            .where('doctor_id', '==', doctorId)
            .where('patient_id', '==', patientId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    async getPatientsByDoctor(doctorId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('doctorPatientLinks')
            .where('doctor_id', '==', doctorId)
            .where('status', '==', 'active')
            .get();

        const patientIds = snapshot.docs.map(doc => doc.data().patient_id);
        const patients = [];

        for (const patientId of patientIds) {
            const patient = await this.getUser(patientId);
            if (patient) patients.push(patient);
        }

        return patients;
    }

    async getDoctorsByPatient(patientId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('doctorPatientLinks')
            .where('patient_id', '==', patientId)
            .where('status', '==', 'active')
            .get();

        const doctorIds = snapshot.docs.map(doc => doc.data().doctor_id);
        const doctors = [];

        for (const doctorId of doctorIds) {
            const doctor = await this.getUser(doctorId);
            if (doctor) doctors.push(doctor);
        }

        return doctors;
    }

    // === APPOINTMENT OPERATIONS ===
    async createAppointment(appointmentData) {
        if (!this.db) throw new Error('Firestore not initialized');
        const aptRef = this.db.collection('appointments').doc();
        await aptRef.set({
            ...appointmentData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return { id: aptRef.id, ...appointmentData };
    }

    async getAppointmentsByPatient(patientId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('appointments')
            .where('patient_id', '==', patientId)
            .get();

        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        results.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        return results;
    }

    async getAppointmentsByDoctor(doctorId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('appointments')
            .where('doctor_id', '==', doctorId)
            .get();

        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        results.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        return results;
    }

    // === FAMILY LINK OPERATIONS ===
    async createFamilyLink(linkData) {
        if (!this.db) throw new Error('Firestore not initialized');
        const linkRef = this.db.collection('familyLinks').doc();
        await linkRef.set({
            ...linkData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return { id: linkRef.id, ...linkData };
    }

    async getFamilyLink(userId, memberId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('familyLinks')
            .where('user_id', '==', userId)
            .where('family_member_id', '==', memberId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    async getFamilyMembers(userId) {
        if (!this.db) throw new Error('Firestore not initialized');

        // 1. Members YOU invited
        const snapshot1 = await this.db.collection('familyLinks')
            .where('user_id', '==', userId)
            .where('status', '==', 'active')
            .get();

        // 2. Members who invited YOU
        const snapshot2 = await this.db.collection('familyLinks')
            .where('family_member_id', '==', userId)
            .where('status', '==', 'active')
            .get();

        const members = [];
        const seenIds = new Set();

        const processDocs = async (snapshot, idField) => {
            for (const doc of snapshot.docs) {
                const linkData = doc.data();
                const memberId = linkData[idField];

                if (seenIds.has(memberId)) continue;
                seenIds.add(memberId);

                const member = await this.getUser(memberId);
                if (member) {
                    members.push({
                        ...member,
                        relation: linkData.relation || 'Family',
                        linkId: doc.id,
                        isInitiator: idField === 'family_member_id'
                    });
                }
            }
        };

        await processDocs(snapshot1, 'family_member_id');
        await processDocs(snapshot2, 'user_id');

        return members;
    }

    async updateFamilyLink(linkId, data) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('familyLinks').doc(linkId).update({
            ...data,
            updatedAt: new Date()
        });
        const doc = await this.db.collection('familyLinks').doc(linkId).get();
        return { id: doc.id, ...doc.data() };
    }
}

module.exports = new FirestoreService();
