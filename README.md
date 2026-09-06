# Swasthya — AI-Powered Health Records Platform

Swasthya (formerly HealthNexus) is an advanced AI-powered health records management system that bridges the gap between doctors and patients. Built with React + Vite frontend and Node.js + Express backend, powered by Google Firebase Firestore and Gemini AI.

---

## ✨ Key Features

### 🩺 AI-Powered Diagnostics & Insights
- **Smart Lab Reports** — Upload lab reports (PDF/Images) and get instant, simplified AI summaries
- **AI Guardian** — Real-time safety checks for medications against patient history and allergies
- **AI Scribe** — Paste or record a consultation transcript and get a structured clinical note
- **Consultation History** — Automatically organized visits and clinical notes

### 🎬 AI Video Explanations (Animated Medical Library)
- **Automated Storyboarding** — For every medicine, generates an AI storyboard explaining how it works
- **Interactive Video Player** — Animated-style explanations breaking down complex mechanisms
- **Searchable Medicine Library** — Search any medicine name to generate and watch a video explanation

### 🔗 Secure Connections
- **Doctor Handshake** — Link with your doctor using a unique QR Code ID, share records with a single click
- **Privacy Control** — Patients choose exactly which reports to share with which doctor
- **Family Health** — Manage health records for your entire family (Mother, Father, Spouse, etc.)
- **Connection Requests** — Adding a family member sends a consent request; they accept/decline from their account
- **Granular Document Sharing** — Choose Full Access, Selected Files Only, or No Access per family member
- **Permission Management** — Update sharing permissions for any connected family member anytime

### 👨‍⚕️ Professional Tools for Doctors
- **Digital Prescriptions** — Generate professional PDF prescriptions, automatically shared with patients
- **Bi-directional View** — Patients see connected doctors; doctors view shared medical history
- **Patient Dashboard** — Track all connected patients, history, and uploaded records

### 📅 OPD & Appointment Management
- **Live Status** — Track current position in the doctor's OPD queue
- **Scheduled Booking** — Book appointments with date, time slot, and type selection
- **In-App Notifications** — Bell icon for events like queue updates, prescriptions, and appointment reminders

---

## 🏗️ Technical Architecture

### Frontend (React + Vite)
- **UI/UX** — Modern, mobile-first design using `framer-motion` for smooth transitions
- **State Management** — React Context API for secure Auth and User data
- **Routing** — React Router v6 with protected routes for patient and doctor dashboards

### Backend (Node.js + Express)
- **Database** — Google Firebase Firestore (NoSQL) for high-speed, scalable data storage
- **File Storage** — Firebase Cloud Storage for documents and generated PDFs
- **Security** — JWT authentication, Firestore security rules, bcrypt password hashing
- **AI Engine** — Google Gemini 1.5 Pro for lab report analysis, safety checks, and scribe
- **Testing** — Jest + Supertest integration tests (25+ test cases)

---

## 🔐 Security & Privacy
- **Private by Default** — No doctor can see a report unless explicitly shared by the patient
- **Secure Auth** — Bcrypt-hashed passwords with JWT access (15m) and refresh tokens (7d)
- **Firestore Rules** — Database-level enforcement of access control policies
- **Consent-Based Family Links** — Family members must accept requests before any data is shared

---

## 🚀 Setup & Running

### Prerequisites
- Node.js (v18+)
- Firebase Project with Firestore and Cloud Storage enabled
- Google Gemini API key

### 1. Backend Setup
```bash
cd backend
npm install
# Copy .env.example to .env and fill in real values
# Place your Firebase service-account.json in backend/
npm run seed   # (Optional) Seed demo doctor and patient accounts
npm run dev    # Starts backend on http://localhost:8000
```

### 2. Frontend Setup
```bash
cd frontend_react
npm install
# Copy .env.example to .env (VITE_API_URL=http://localhost:8000)
npm run dev    # Starts frontend on http://localhost:5173
```

### 3. Run Tests
```bash
cd backend
npm test       # Runs 25+ integration tests
```

- **Backend API**: `http://localhost:8000`
- **Frontend App**: `http://localhost:5173`

---

## 🧪 Demo Credentials

Seed demo accounts by running:
```bash
cd backend
npm run seed
```

All demo accounts use the password: `Demo@1234`

| Role | Email | Phone |
|------|-------|-------|
| Doctor | `doctor@demo.com` | `+19998887777` |
| Patient (Main) | `patient1@demo.com` | `+19998887778` |
| Patient (Secondary) | `patient2@demo.com` | `+19998887779` |

---

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Firebase Admin SDK setup
│   │   ├── controllers/    # Route handlers (auth, documents, family, AI, etc.)
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Firestore, AI, Storage, PDF services
│   │   └── server.js        # Express app entry point
│   └── tests/               # Jest integration tests
├── frontend_react/
│   ├── src/
│   │   ├── components/      # Reusable UI components (Navbar, NotificationBell, etc.)
│   │   ├── context/         # React Context (Auth)
│   │   ├── pages/           # Page components (Records, Family, Scribe, etc.)
│   │   └── App.jsx          # Router and layout
│   └── index.html
├── firestore.rules           # Firestore security rules
├── firebase.json             # Firebase configuration
└── README.md
```

---

## 👥 Credits

This project was developed and maintained with contributions from:

- **Sumit Kumar Ratna**
- **Aditya Singh**
- **Anshika Thakur**
- **Ankit Kumar**
- **Saad Khan**
- **Mohit Raj**
