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

    async getUserByIdentifier(identifier) {
        if (!this.db || !identifier) return null;
        const clean = String(identifier).trim();
        if (clean.includes('@')) {
            return this.getUserByEmail(clean.toLowerCase());
        }
        // Try by phone first
        let user = await this.getUserByPhone(clean);
        if (!user) {
            // Also try email in case identifier did not contain @ or was case-insensitive
            user = await this.getUserByEmail(clean.toLowerCase());
        }
        return user;
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

    async getFamilyLinkById(linkId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const doc = await this.db.collection('familyLinks').doc(linkId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
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

    async getActiveFamilyLink(userA, userB) {
        if (!this.db) throw new Error('Firestore not initialized');
        let link = await this.getFamilyLink(userA, userB);
        if (!link) {
            link = await this.getFamilyLink(userB, userA);
        }
        return link;
    }

    async getPendingFamilyRequests(userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('familyLinks')
            .where('family_member_id', '==', userId)
            .where('status', '==', 'pending')
            .get();

        const requests = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const requester = await this.getUser(data.user_id);
            requests.push({
                linkId: doc.id,
                relation: data.relation || 'Family',
                status: data.status,
                createdAt: data.createdAt,
                requester: requester ? {
                    id: requester.id,
                    name: requester.name,
                    email: requester.email,
                    phone: requester.phone
                } : { id: data.user_id, name: 'Family Member' }
            });
        }
        return requests;
    }

    async getOutgoingFamilyRequests(userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('familyLinks')
            .where('user_id', '==', userId)
            .where('status', '==', 'pending')
            .get();

        const requests = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const recipient = await this.getUser(data.family_member_id);
            requests.push({
                linkId: doc.id,
                relation: data.relation || 'Family',
                status: data.status,
                createdAt: data.createdAt,
                recipient: recipient ? {
                    id: recipient.id,
                    name: recipient.name,
                    email: recipient.email,
                    phone: recipient.phone
                } : { id: data.family_member_id, name: 'Family Member' }
            });
        }
        return requests;
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
                    const permissions = linkData.permissions || {};
                    members.push({
                        ...member,
                        relation: linkData.relation || 'Family',
                        linkId: doc.id,
                        isInitiator: idField === 'family_member_id',
                        // What I granted to this member
                        myGrantedPermissions: permissions[userId] || { access_level: 'full', allowed_document_ids: [] },
                        // What this member granted to me
                        memberGrantedPermissions: permissions[memberId] || { access_level: 'full', allowed_document_ids: [] }
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

    async deleteFamilyLink(linkId) {
        if (!this.db) throw new Error('Firestore not initialized');
        await this.db.collection('familyLinks').doc(linkId).delete();
    }



    /**
     * At signup, auto-activate any pending familyLinks where another user already
     * initiated a link to this userId. This covers the case where someone added a
     * family member by phone before that person had registered — the registration
     * itself serves as consent/verification.
     * @param {string} userId - The newly registered user's ID
     * @returns {number} Number of links activated
     */
    async autoActivatePendingFamilyLinks(userId) {
        if (!this.db) throw new Error('Firestore not initialized');

        const snapshot = await this.db.collection('familyLinks')
            .where('family_member_id', '==', userId)
            .where('status', '==', 'pending')
            .get();

        if (snapshot.empty) return 0;

        const batch = this.db.batch ? this.db.batch() : null;
        for (const doc of snapshot.docs) {
            const update = { status: 'active', verified_at: new Date().toISOString(), updatedAt: new Date() };
            if (batch) {
                batch.update(doc.ref, update);
            } else {
                await doc.ref.update(update);
            }
        }
        if (batch) await batch.commit();

        console.log(`[FAMILY] Auto-activated ${snapshot.size} pending link(s) for new user ${userId}`);
        return snapshot.size;
    }

    // === NOTIFICATION OPERATIONS ===
    async createNotification(notifData) {
        if (!this.db) throw new Error('Firestore not initialized');
        const notifRef = this.db.collection('notifications').doc();
        const notification = {
            ...notifData,
            read: false,
            createdAt: notifData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await notifRef.set(notification);
        return { id: notifRef.id, ...notification };
    }

    async getNotificationsByUser(userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('notifications')
            .where('user_id', '==', userId)
            .get();

        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return results;
    }

    async markNotificationAsRead(notifId, userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const notifRef = this.db.collection('notifications').doc(notifId);
        const doc = await notifRef.get();
        if (!doc.exists) return null;
        if (userId && doc.data().user_id !== userId) return null;

        await notifRef.update({
            read: true,
            updatedAt: new Date().toISOString()
        });
        return { id: doc.id, ...doc.data(), read: true };
    }

    async markAllNotificationsAsRead(userId) {
        if (!this.db) throw new Error('Firestore not initialized');
        const snapshot = await this.db.collection('notifications')
            .where('user_id', '==', userId)
            .where('read', '==', false)
            .get();

        const batch = this.db.batch ? this.db.batch() : null;
        for (const doc of snapshot.docs) {
            if (batch) {
                batch.update(doc.ref, { read: true, updatedAt: new Date().toISOString() });
            } else {
                await doc.ref.update({ read: true, updatedAt: new Date().toISOString() });
            }
        }
        if (batch) await batch.commit();
        return { updated: snapshot.size };
    }
}

module.exports = new FirestoreService();
