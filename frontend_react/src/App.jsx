import React, { useContext } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import DoctorNavbar from './components/DoctorNavbar';

// Patient Pages
import Home from './pages/Home';
import CareTeam from './pages/CareTeam';
import ScanQR from './pages/ScanQR';
import Records from './pages/Records';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import Services from './pages/Services';
import Support from './pages/Support';
import Status from './pages/Status';
import LearnMedicines from './pages/LearnMedicines';
import ConsultationDetails from './pages/ConsultationDetails';
import FamilyHealth from './pages/FamilyHealth';
import FamilyMemberDetails from './pages/FamilyMemberDetails';

// Auth Pages
import RoleSelection from './pages/RoleSelection';
import Login from './pages/Login';
import DoctorLogin from './pages/DoctorLogin';
import Signup from './pages/Signup';

// Doctor Pages
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatients from './pages/DoctorPatients';
import PatientHistory from './pages/PatientHistory';
import PrescribeMedicine from './pages/PrescribeMedicine';
import AddDiagnosis from './pages/AddDiagnosis';
import DoctorQR from './pages/DoctorQR';

const MainApp = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const hideNavRoutes = ['/scan', '/login/patient', '/login/doctor', '/'];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading HealthNexus...
      </div>
    );
  }

  // Public routes (no auth required)
  const publicRoutes = ['/', '/login/patient', '/login/doctor', '/signup'];
  // If not logged in and trying to access a protected route, redirect to home
  // But wait, if we are on a public route, we should allow it.
  if (!user && !publicRoutes.includes(location.pathname)) {
    // Allow access if it starts with public route (e.g. /login/patient/...) or exact match?
    // For now, exact match is checked.
    console.log("Redirecting to / from", location.pathname);
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div style={{ paddingBottom: hideNavRoutes.includes(location.pathname) ? '0' : '80px' }}>
        <Routes>
          {/* Landing Page - Home for Patients, Dashboard for Doctors */}
          <Route path="/" element={!user ? <RoleSelection /> : (user.role === 'doctor' ? <Navigate to="/doctor/dashboard" /> : <Navigate to="/home" />)} />

          {/* Auth Routes */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login/patient" element={!user ? <Login /> : <Navigate to="/home" />} />
          <Route path="/login/doctor" element={!user ? <DoctorLogin /> : <Navigate to="/doctor/dashboard" />} />

          {/* Patient Routes */}
          {user?.role === 'patient' && (
            <>
              <Route path="/learn-medicine" element={<LearnMedicines />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/status" element={<Status />} />
              <Route path="/records" element={<Records />} />
              <Route path="/services" element={<Services />} />
              <Route path="/support" element={<Support />} />
              <Route path="/home" element={<Home />} />
              <Route path="/care-team" element={<CareTeam />} />
              <Route path="/scan" element={<ScanQR />} />
              <Route path="/consultation/:date/:doctorId" element={<ConsultationDetails />} />
              <Route path="/family" element={<FamilyHealth />} />
              <Route path="/family/:memberId" element={<FamilyMemberDetails />} />
            </>
          )}

          {/* Shared Routes (Doctor & Patient) */}
          {user && (
            <Route path="/profile" element={<Profile />} />
          )}

          {/* Doctor Routes */}
          {user?.role === 'doctor' && (
            <>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route path="/doctor/patient/:patient_id" element={<PatientHistory />} />
              <Route path="/doctor/prescribe" element={<PrescribeMedicine />} />
              <Route path="/doctor/diagnosis" element={<AddDiagnosis />} />
              <Route path="/doctor/qr" element={<DoctorQR />} />
            </>
          )}

          {/* Catch all - redirect based on role */}
          <Route path="*" element={<Navigate to={user ? (user.role === 'doctor' ? '/doctor/dashboard' : '/home') : '/'} />} />
        </Routes>
      </div>

      {/* Show Navbar only for logged-in users and not on certain routes */}
      {user && !hideNavRoutes.includes(location.pathname) && (
        user.role === 'doctor' ? <DoctorNavbar /> : <Navbar />
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
