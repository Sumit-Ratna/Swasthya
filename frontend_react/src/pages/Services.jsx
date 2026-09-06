import React, { useState, useContext } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { PlusCircle, Video, Activity, Scan, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';

const Services = () => {
    const { user } = useContext(AuthContext);
    const [booking, setBooking] = useState(false);
    const navigate = useNavigate();

    // Guardian AI State
    const [medication, setMedication] = useState('');
    const [safetyAnalysis, setSafetyAnalysis] = useState(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');

    // Patient allergies from user context (if available)
    const patientHistory = {
        allergies: user?.medical_history?.allergies || [],
        conditions: user?.medical_history?.chronic_diseases || []
    };

    const checkSafety = async () => {
        if (!medication) {
            setError('Please enter a medication name');
            return;
        }
        setChecking(true);
        setSafetyAnalysis(null);
        setError('');
        try {
            const res = await axios.post(`${API_URL}/api/ai/safety-check`, {
                newMed: medication,
                patientHistory
            });
            setSafetyAnalysis(res.data.analysis);
        } catch (err) {
            console.error('Safety check error:', err);
            setError(err.response?.data?.error || 'Safety check failed. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    const handleBookOpd = async () => {
        setBooking(true);
        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`${API_URL}/api/appointments/book/opd`, {
                symptoms: "General Checkup",
                notes: "Self-booked via App"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("OPD Token Generated! Check Status tab.");
        } catch (err) {
            alert("Booking Failed");
        } finally {
            setBooking(false);
        }
    };

    return (
        <div style={{ padding: '20px', paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="animate-enter">Medical Services</h1>
                <button
                    onClick={() => navigate('/scan')}
                    style={{
                        background: '#007AFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)'
                    }}
                >
                    <Scan size={20} />
                </button>
            </div>

            {/* Guardian AI Safety Check Section */}
            <motion.div
                className="card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: 'linear-gradient(135deg, #FF9500 0%, #FF2D55 100%)', color: 'white', marginTop: '24px', marginBottom: '24px' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <ShieldCheck size={28} style={{ marginRight: '10px' }} />
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Guardian AI Safety Check</h2>
                </div>
                <p style={{ opacity: 0.9, marginTop: 0, fontSize: '14px' }}>
                    Check for drug interactions against your medical history
                    {patientHistory.allergies.length > 0 && (
                        <><br /><b>Your Allergies: </b>{patientHistory.allergies.join(", ")}</>
                    )}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Enter medication name..."
                            value={medication}
                            onChange={(e) => setMedication(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && checkSafety()}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                fontSize: '16px', color: '#1C1C1E', outline: 'none'
                            }}
                        />
                        <button
                            onClick={checkSafety}
                            disabled={checking}
                            style={{
                                background: 'white', color: '#FF2D55', fontWeight: 'bold',
                                border: 'none', borderRadius: '12px', padding: '0 20px', cursor: checking ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {checking ? '...' : 'Check'}
                        </button>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                            <AlertCircle size={16} style={{ marginRight: '8px' }} />
                            <span style={{ fontSize: '14px' }}>{error}</span>
                        </div>
                    )}
                </div>

                {safetyAnalysis && (
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
                        <strong>Analysis:</strong>
                        <p style={{ margin: '8px 0 0', color: 'white', fontWeight: 500, fontSize: '14px', lineHeight: '1.5' }}>{safetyAnalysis}</p>
                    </div>
                )}
            </motion.div>

            <h3 style={{ marginBottom: '16px' }}>Quick Services</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBookOpd}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: '#E1F0FF', cursor: 'pointer' }}
                >
                    <PlusCircle size={32} color="#007AFF" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: '#007AFF' }}>OPD Booking</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: '#FFF0F5' }}
                >
                    <Video size={32} color="#FF2D55" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: '#FF2D55' }}>Video Consult</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px' }}
                >
                    <Activity size={32} color="#34C759" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600, color: '#34C759' }}>Lab Tests</span>
                </motion.div>

                <motion.div
                    className="card"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.location.href = '/learn-medicine'}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '140px',
                        background: 'linear-gradient(135deg, #FF9500 0%, #FFCC00 100%)',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    <Video size={32} color="white" style={{ marginBottom: '12px' }} />
                    <span style={{ fontWeight: 600 }}>Medicine Library</span>
                </motion.div>
            </div>
        </div>
    );
};

export default Services;
