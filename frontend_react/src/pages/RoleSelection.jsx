import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, User, HeartPulse } from 'lucide-react';

const RoleSelection = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
        }}>
            {/* Logo and Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}
            >
                <div style={{
                    width: '100px',
                    height: '100px',
                    background: 'white',
                    borderRadius: '24px',
                    margin: '0 auto 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                    <HeartPulse size={56} color="#0d9488" />
                </div>
                <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>
                    HealthNexus
                </h1>
                <p style={{ fontSize: '18px', color: '#64748b' }}>
                    Smart Medical Records Platform
                </p>
            </motion.div>

            {/* Role Selection Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '750px', width: '100%' }}>
                {/* Patient Login */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login/patient')}
                    style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                        borderRadius: '24px',
                        padding: '40px 32px',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(13, 148, 136, 0.3)',
                        textAlign: 'center',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Background Pattern */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '20px',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <User size={40} color="white" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>I'm a Patient</h2>
                    <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '24px', lineHeight: '1.5' }}>
                        Access your medical records, upload lab reports, and book appointments
                    </p>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 24px',
                        background: 'white',
                        color: '#0f766e',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 700,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        Patient Login →
                    </div>
                </motion.div>

                {/* Doctor Login */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login/doctor')}
                    style={{
                        background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
                        borderRadius: '24px',
                        padding: '40px 32px',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(71, 85, 105, 0.3)',
                        textAlign: 'center',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Background Pattern */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '20px',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <Stethoscope size={40} color="white" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>I'm a Doctor</h2>
                    <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '24px', lineHeight: '1.5' }}>
                        Manage patients, prescribe medicines, and access medical histories
                    </p>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 24px',
                        background: 'white',
                        color: '#334155',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 700,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        Doctor Login →
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: '40px', color: '#64748b', fontSize: '13px' }}
            >
                Powered by AI • Secure • HIPAA Compliant
            </motion.p>
        </div>
    );
};

export default RoleSelection;
