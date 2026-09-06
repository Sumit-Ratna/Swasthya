const express = require('express');
const cors = require('cors');
const { db } = require('./config/firebaseAdmin');
const path = require('path');
require('dotenv').config();

const connectRoutes = require('./routes/connect');
const aiRoutes = require('./routes/ai');
const documentRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctor');
const familyRoutes = require('./routes/family');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS — origin read from env, never hardcoded
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.send('HealthNexus API is Running with Firebase');
});

// Start Server with Firestore Check
if (require.main === module) {
    if (db) {
        console.log('[SUCCESS] Firestore initialized successfully');
    } else {
        console.warn('[WARNING] Firestore not initialized. Add service-account.json to enable database.');
    }

    app.listen(PORT, () => {
        console.log(`[SERVER] Running on port ${PORT}`);
        console.log(`[DATABASE] Firebase Firestore`);
        console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
    });
}

module.exports = app;
