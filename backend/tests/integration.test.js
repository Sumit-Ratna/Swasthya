/**
 * Integration Tests for HealthNexus Backend API
 *
 * Tests:
 * 1. User Registration (Success + Duplicate Rejection)
 * 2. User Login (Success + Wrong Password)
 * 3. Protected Route Rejecting Missing / Invalid Token
 * 4. Document Sharing Visibility (Patient vs Shared Doctor vs Unshared Doctor)
 * 5. Doctor-Patient QR Connect Flow (Lookup + Link)
 *
 * All tests run strictly against an in-memory mock of firestoreService — never real Firestore.
 */

// Set environment variables for tests
process.env.JWT_SECRET = 'test_secret_key_123456789012345678901234567890';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.BCRYPT_SALT_ROUNDS = '4'; // fast for tests

const crypto = require('crypto');

// In-Memory Database Store for testing
const mockStore = {
    users: new Map(),
    documents: new Map(),
    doctorPatientLinks: new Map(),
    familyLinks: new Map(),
    appointments: new Map()
};

// Reset store helper
function resetMockStore() {
    mockStore.users.clear();
    mockStore.documents.clear();
    mockStore.doctorPatientLinks.clear();
    mockStore.familyLinks.clear();
    mockStore.appointments.clear();
}

// Mock firestoreService before requiring server/app
jest.mock('../src/services/firestoreService', () => {
    const crypto = require('crypto');
    return {
        db: {
            collection: (colName) => ({
                where: (field1, op1, val1) => ({
                    where: (field2, op2, val2) => ({
                        limit: (num) => ({
                            get: async () => {
                                const docs = [];
                                const sourceMap = colName === 'users' ? mockStore.users : new Map();
                                for (const [id, item] of sourceMap.entries()) {
                                    if (item[field1] === val1 && item[field2] === val2) {
                                        docs.push({ id, data: () => ({ ...item }) });
                                        if (docs.length >= num) break;
                                    }
                                }
                                return { empty: docs.length === 0, docs };
                            }
                        })
                    })
                }),
                doc: (id) => ({
                    delete: jest.fn().mockResolvedValue({})
                })
            })
        },

        // User methods
        getUser: jest.fn(async (id) => {
            const user = mockStore.users.get(id);
            return user ? { ...user } : null;
        }),

        getUserByPhone: jest.fn(async (phone) => {
            for (const user of mockStore.users.values()) {
                if (user.phone === phone) return { ...user };
            }
            return null;
        }),

        getUserByEmail: jest.fn(async (email) => {
            for (const user of mockStore.users.values()) {
                if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
                    return { ...user };
                }
            }
            return null;
        }),

        createUser: jest.fn(async (id, userData) => {
            const user = { id, ...userData, createdAt: new Date() };
            mockStore.users.set(id, user);
            return { ...user };
        }),

        updateUser: jest.fn(async (id, updates) => {
            const existing = mockStore.users.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...updates, updatedAt: new Date() };
            mockStore.users.set(id, updated);
            return { ...updated };
        }),

        // Document methods
        getDocument: jest.fn(async (id) => {
            const doc = mockStore.documents.get(id);
            return doc ? { ...doc } : null;
        }),

        getDocumentsByPatient: jest.fn(async (patientId) => {
            const results = [];
            for (const doc of mockStore.documents.values()) {
                if (String(doc.patient_id) === String(patientId)) {
                    results.push({ ...doc });
                }
            }
            return results;
        }),

        createDocument: jest.fn(async (docData) => {
            const id = crypto.randomUUID();
            const doc = { id, ...docData, createdAt: new Date() };
            mockStore.documents.set(id, doc);
            return { ...doc };
        }),

        updateDocument: jest.fn(async (id, updates) => {
            const existing = mockStore.documents.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...updates, updatedAt: new Date() };
            mockStore.documents.set(id, updated);
            return { ...updated };
        }),

        deleteDocument: jest.fn(async (id) => {
            mockStore.documents.delete(id);
            return true;
        }),

        // Doctor-Patient Link methods
        getDoctorPatientLink: jest.fn(async (doctorId, patientId) => {
            for (const link of mockStore.doctorPatientLinks.values()) {
                if (link.doctor_id === doctorId && link.patient_id === patientId) {
                    return { ...link };
                }
            }
            return null;
        }),

        createDoctorPatientLink: jest.fn(async (linkData) => {
            const id = crypto.randomUUID();
            const link = { id, ...linkData, createdAt: new Date() };
            mockStore.doctorPatientLinks.set(id, link);
            return { ...link };
        }),

        updateDoctorPatientLink: jest.fn(async (id, updates) => {
            const existing = mockStore.doctorPatientLinks.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...updates, updatedAt: new Date() };
            mockStore.doctorPatientLinks.set(id, updated);
            return { ...updated };
        }),

        getDoctorsByPatient: jest.fn(async (patientId) => {
            const results = [];
            for (const link of mockStore.doctorPatientLinks.values()) {
                if (link.patient_id === patientId && link.status === 'active') {
                    const doctor = mockStore.users.get(link.doctor_id);
                    if (doctor) results.push({ ...doctor });
                }
            }
            return results;
        }),

        getPatientsByDoctor: jest.fn(async (doctorId) => {
            const results = [];
            for (const link of mockStore.doctorPatientLinks.values()) {
                if (link.doctor_id === doctorId && link.status === 'active') {
                    const patient = mockStore.users.get(link.patient_id);
                    if (patient) results.push({ ...patient });
                }
            }
            return results;
        }),

        getConnectedDoctors: jest.fn(async (patientId) => {
            const results = [];
            for (const link of mockStore.doctorPatientLinks.values()) {
                if (link.patient_id === patientId && link.status === 'active') {
                    const doctor = mockStore.users.get(link.doctor_id);
                    results.push({
                        link_id: link.id,
                        status: link.status,
                        doctor: doctor ? { ...doctor } : null
                    });
                }
            }
            return results;
        }),

        getConnectedPatients: jest.fn(async (doctorId) => {
            const results = [];
            for (const link of mockStore.doctorPatientLinks.values()) {
                if (link.doctor_id === doctorId && link.status === 'active') {
                    const patient = mockStore.users.get(link.patient_id);
                    if (patient) results.push({ ...patient });
                }
            }
            return results;
        }),

        getDoctorByQrId: jest.fn(async (doctorQrId) => {
            for (const user of mockStore.users.values()) {
                if (user.role === 'doctor' && user.doctor_qr_id === doctorQrId) {
                    return { ...user };
                }
            }
            return null;
        }),

        // Family Link methods
        getFamilyLink: jest.fn(async (userId, memberId) => {
            for (const link of mockStore.familyLinks.values()) {
                if (link.user_id === userId && link.family_member_id === memberId) {
                    return { ...link };
                }
            }
            return null;
        }),

        createFamilyLink: jest.fn(async (linkData) => {
            const id = crypto.randomUUID();
            const link = { id, ...linkData, createdAt: new Date() };
            mockStore.familyLinks.set(id, link);
            return { ...link };
        }),

        updateFamilyLink: jest.fn(async (id, updates) => {
            const existing = mockStore.familyLinks.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...updates, updatedAt: new Date() };
            mockStore.familyLinks.set(id, updated);
            return { ...updated };
        }),

        getFamilyMembers: jest.fn(async (userId) => {
            const members = [];
            for (const link of mockStore.familyLinks.values()) {
                if (link.user_id === userId && link.status === 'active') {
                    const member = mockStore.users.get(link.family_member_id);
                    if (member) {
                        members.push({ ...member, relation: link.relation, link_id: link.id });
                    }
                }
            }
            return members;
        }),

        // Appointments methods
        getAppointmentsByPatient: jest.fn(async (patientId) => {
            const results = [];
            for (const appt of mockStore.appointments.values()) {
                if (appt.patient_id === patientId) results.push({ ...appt });
            }
            return results;
        }),

        getAppointmentsByDoctor: jest.fn(async (doctorId) => {
            const results = [];
            for (const appt of mockStore.appointments.values()) {
                if (appt.doctor_id === doctorId) results.push({ ...appt });
            }
            return results;
        }),

        createAppointment: jest.fn(async (data) => {
            const id = crypto.randomUUID();
            const appt = { id, ...data, createdAt: new Date() };
            mockStore.appointments.set(id, appt);
            return { ...appt };
        })
    };
});

// Mock storageService to avoid external calls
jest.mock('../src/services/storageService', () => ({
    uploadBuffer: jest.fn(async (buffer, path, mimetype) => `https://storage.googleapis.com/test-bucket/${path}`),
    deleteFile: jest.fn(async () => true)
}));

// Mock aiService
jest.mock('../src/services/aiService', () => ({
    analyzeLabReport: jest.fn(async () => ({ summary: "Mock AI analysis result" })),
    checkSafety: jest.fn(async () => "Mock safety analysis")
}));

const request = require('supertest');
const app = require('../src/server');

describe('HealthNexus API Integration Tests', () => {

    beforeEach(() => {
        resetMockStore();
        jest.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. User Registration (Success + Duplicate Rejection)
    // ─────────────────────────────────────────────────────────────────────────
    describe('1. User Registration (POST /api/auth/register)', () => {
        it('should register a new patient successfully and return JWT tokens', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Alice Patient',
                    phone: '+15551112222',
                    email: 'alice@test.com',
                    password: 'SecurePassword123!',
                    confirmPassword: 'SecurePassword123!',
                    role: 'patient'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user).toBeDefined();
            expect(res.body.user.name).toBe('Alice Patient');
            expect(res.body.user.role).toBe('patient');
            expect(res.body.user.password_hash).toBeUndefined(); // Sensitive field omitted
        });

        it('should reject registration when phone already exists (duplicate rejection)', async () => {
            // First registration
            const firstRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'First User',
                    phone: '+15553334444',
                    email: 'first@test.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!',
                    role: 'patient'
                });
            expect(firstRes.status).toBe(201);

            // Duplicate registration attempt with same phone
            const duplicateRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Duplicate User',
                    phone: '+15553334444',
                    email: 'other@test.com',
                    password: 'AnotherPassword123!',
                    confirmPassword: 'AnotherPassword123!',
                    role: 'patient'
                });

            expect(duplicateRes.status).toBe(409);
            expect(duplicateRes.body.error).toMatch(/phone number already exists/i);
        });

        it('should reject registration when email already exists', async () => {
            const firstRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'User One',
                    phone: '+15555551111',
                    email: 'duplicate@test.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!',
                    role: 'patient'
                });
            expect(firstRes.status).toBe(201);

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'User Two',
                    phone: '+15555552222',
                    email: 'duplicate@test.com',
                    password: 'Password123!',
                    confirmPassword: 'Password123!',
                    role: 'patient'
                });

            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/email address already exists/i);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. User Login (Success + Wrong Password)
    // ─────────────────────────────────────────────────────────────────────────
    describe('2. User Login (POST /api/auth/login)', () => {
        beforeEach(async () => {
            // Seed a registered doctor
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Dr. Test Doctor',
                    phone: '+15559990001',
                    email: 'doctor@test.com',
                    password: 'DoctorPassword123!',
                    confirmPassword: 'DoctorPassword123!',
                    role: 'doctor',
                    specialization: 'Cardiology'
                });
        });

        it('should login successfully with valid email and password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'doctor@test.com',
                    password: 'DoctorPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user.email).toBe('doctor@test.com');
            expect(res.body.user.role).toBe('doctor');
        });

        it('should login successfully with valid phone and password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: '+15559990001',
                    password: 'DoctorPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.user.phone).toBe('+15559990001');
        });

        it('should reject login with incorrect password (wrong password)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'doctor@test.com',
                    password: 'WrongPassword!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid credentials/i);
        });

        it('should reject login for non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'nobody@test.com',
                    password: 'AnyPassword123!'
                });

            expect(res.status).toBe(401);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Protected Route Rejecting Missing / Invalid Token
    // ─────────────────────────────────────────────────────────────────────────
    describe('3. Protected Route Token Verification', () => {
        it('should return 401 when Authorization header is missing', async () => {
            const res = await request(app)
                .get('/api/profile');

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/access denied|no token provided/i);
        });

        it('should return 401 when Bearer token is invalid or malformed', async () => {
            const res = await request(app)
                .get('/api/profile')
                .set('Authorization', 'Bearer totally_invalid_token_string');

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid token/i);
        });

        it('should permit access to protected route when valid Bearer token is provided', async () => {
            // Register and get valid token
            const regRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Auth Protected User',
                    phone: '+15558889999',
                    password: 'ValidPassword123!',
                    confirmPassword: 'ValidPassword123!',
                    role: 'patient'
                });

            const token = regRes.body.accessToken;

            const profileRes = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(profileRes.status).toBe(200);
            expect(profileRes.body.name).toBe('Auth Protected User');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Document Sharing Visibility
    // ─────────────────────────────────────────────────────────────────────────
    describe('4. Document Sharing Visibility', () => {
        let patientToken, patientUser;
        let sharedDoctorToken, sharedDoctorUser;
        let unsharedDoctorToken, unsharedDoctorUser;
        let testDoc;

        beforeEach(async () => {
            // Create patient
            const pRes = await request(app).post('/api/auth/register').send({
                name: 'Patient Bob',
                phone: '+15550001111',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                role: 'patient'
            });
            patientToken = pRes.body.accessToken;
            patientUser = pRes.body.user;

            // Create Doctor 1 (will be shared)
            const d1Res = await request(app).post('/api/auth/register').send({
                name: 'Dr. Shared',
                phone: '+15550002222',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                role: 'doctor'
            });
            sharedDoctorToken = d1Res.body.accessToken;
            sharedDoctorUser = d1Res.body.user;

            // Create Doctor 2 (unshared, not linked)
            const d2Res = await request(app).post('/api/auth/register').send({
                name: 'Dr. Unshared',
                phone: '+15550003333',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                role: 'doctor'
            });
            unsharedDoctorToken = d2Res.body.accessToken;
            unsharedDoctorUser = d2Res.body.user;

            // Create document for patient in mockStore, shared only with Doctor 1
            const firestoreService = require('../src/services/firestoreService');
            testDoc = await firestoreService.createDocument({
                patient_id: patientUser.id,
                type: 'lab_report',
                file_url: 'https://storage.googleapis.com/test-bucket/doc.pdf',
                summary: 'Blood Test Results',
                is_shared: true,
                shared_with: [sharedDoctorUser.id]
            });
        });

        it('should allow the owning patient to view their document', async () => {
            const res = await request(app)
                .get(`/api/documents/patient/${patientUser.id}`)
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].id).toBe(testDoc.id);
        });

        it('should allow the shared doctor to view the shared document', async () => {
            const res = await request(app)
                .get(`/api/documents/patient/${patientUser.id}`)
                .set('Authorization', `Bearer ${sharedDoctorToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].id).toBe(testDoc.id);
        });

        it('should not allow an unshared & unconnected doctor to see unshared documents', async () => {
            const res = await request(app)
                .get(`/api/documents/patient/${patientUser.id}`)
                .set('Authorization', `Bearer ${unsharedDoctorToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Doctor-Patient QR Connect Flow
    // ─────────────────────────────────────────────────────────────────────────
    describe('5. Doctor-Patient QR Connect Flow', () => {
        let doctorUser, doctorToken, patientToken, patientUser;

        beforeEach(async () => {
            // Register doctor with unique doctor_qr_id
            const docRes = await request(app).post('/api/auth/register').send({
                name: 'Dr. Gregory House',
                phone: '+15557778888',
                email: 'house@clinic.com',
                password: 'Diagnostic123!',
                confirmPassword: 'Diagnostic123!',
                role: 'doctor',
                doctor_qr_id: 'DOC-HOUSE-99',
                specialization: 'Diagnostic Medicine',
                hospital_name: 'Princeton-Plainsboro'
            });
            doctorUser = docRes.body.user;
            doctorToken = docRes.body.accessToken;

            // Register patient
            const patRes = await request(app).post('/api/auth/register').send({
                name: 'John Doe',
                phone: '+15557771111',
                password: 'PatientPass123!',
                confirmPassword: 'PatientPass123!',
                role: 'patient'
            });
            patientUser = patRes.body.user;
            patientToken = patRes.body.accessToken;
        });

        it('should lookup doctor information using QR Code ID', async () => {
            const res = await request(app)
                .get('/api/connect/doctor/qr/DOC-HOUSE-99')
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Dr. Gregory House');
            expect(res.body.doctor_qr_id).toBe('DOC-HOUSE-99');
            expect(res.body.specialization).toBe('Diagnostic Medicine');
        });

        it('should return 404 for non-existent doctor QR ID', async () => {
            const res = await request(app)
                .get('/api/connect/doctor/qr/NON_EXISTENT_QR')
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/doctor not found/i);
        });

        it('should establish an active link between patient and doctor via QR ID', async () => {
            const linkRes = await request(app)
                .post('/api/connect/doctor/link')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    doctor_qr_id: 'DOC-HOUSE-99'
                });

            expect(linkRes.status).toBe(200);
            expect(linkRes.body.message).toMatch(/connected/i);
            expect(linkRes.body.doctor.name).toBe('Dr. Gregory House');

            // Verify the doctor can now see the connected patient
            const docPatientsRes = await request(app)
                .get('/api/connect/doctor/patients')
                .set('Authorization', `Bearer ${doctorToken}`);

            expect(docPatientsRes.status).toBe(200);
            expect(docPatientsRes.body.some(p => p.id === patientUser.id)).toBe(true);
        });
    });

    describe('6. Scheduled Appointments (POST /api/appointments/book/scheduled)', () => {
        let doctorUser;
        let doctorToken;
        let patientUser;
        let patientToken;

        beforeEach(async () => {
            const docRes = await request(app).post('/api/auth/register').send({
                name: 'Dr. Jane Watson',
                phone: '+15551239999',
                password: 'DoctorPass123!',
                confirmPassword: 'DoctorPass123!',
                role: 'doctor',
                specialization: 'Cardiology',
                hospital_name: 'St. Jude Hospital'
            });
            doctorUser = docRes.body.user;
            doctorToken = docRes.body.accessToken;

            const patRes = await request(app).post('/api/auth/register').send({
                name: 'Alice Wonder',
                phone: '+15559871111',
                password: 'PatientPass123!',
                confirmPassword: 'PatientPass123!',
                role: 'patient'
            });
            patientUser = patRes.body.user;
            patientToken = patRes.body.accessToken;
        });

        it('should successfully book a scheduled appointment with doctor, date, time slot, and type', async () => {
            const res = await request(app)
                .post('/api/appointments/book/scheduled')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    doctor_id: doctorUser.id,
                    appointment_date: '2026-09-15',
                    appointment_time: '10:30 AM',
                    type: 'Follow-up',
                    symptoms: 'Check blood pressure recovery'
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toMatch(/scheduled appointment confirmed/i);
            expect(res.body.appointment).toBeDefined();
            expect(res.body.appointment.patient_id).toBe(patientUser.id);
            expect(res.body.appointment.doctor_id).toBe(doctorUser.id);
            expect(res.body.appointment.type).toBe('Follow-up');
            expect(res.body.appointment.appointment_time).toBe('10:30 AM');
            expect(res.body.appointment.doctor.name).toBe('Dr. Jane Watson');
            expect(res.body.appointment.doctor.specialization).toBe('Cardiology');

            // Verify patient can retrieve it in /api/appointments/my-list
            const listRes = await request(app)
                .get('/api/appointments/my-list')
                .set('Authorization', `Bearer ${patientToken}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.some(a => a.doctor_id === doctorUser.id && a.type === 'Follow-up')).toBe(true);
        });

        it('should reject scheduled booking when doctor_id is missing', async () => {
            const res = await request(app)
                .post('/api/appointments/book/scheduled')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    appointment_date: '2026-09-15',
                    appointment_time: '11:00 AM',
                    type: 'Consultation'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/doctor_id is required/i);
        });

        it('should reject scheduled booking when appointment_date is missing', async () => {
            const res = await request(app)
                .post('/api/appointments/book/scheduled')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    doctor_id: doctorUser.id,
                    appointment_time: '11:00 AM'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/appointment_date is required/i);
        });
    });
});
