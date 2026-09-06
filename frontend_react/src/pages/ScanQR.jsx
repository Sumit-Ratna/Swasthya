import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Camera, X, Check, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

const ScanQR = () => {
    const { user } = useContext(AuthContext);
    const [manualId, setManualId] = useState('');
    const [status, setStatus] = useState('idle'); // idle, searching, found, connecting, success, error
    const [doctorData, setDoctorData] = useState(null);
    const [message, setMessage] = useState('');

    const handleSearch = async () => {
        if (!manualId) return;
        setStatus('searching');
        setMessage('');
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/connect/doctor/qr/${manualId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctorData(res.data);
            console.log("SEARCH RESPONSE:", res.data);
            setStatus('found');
        } catch (err) {
            console.error("Search Error:", err);

            if (err.response?.data?.error === 'Invalid Token' || err.response?.status === 401) {
                alert("Session expired. Please login again.");
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
                return;
            }

            setStatus('error');
            setMessage(err.response?.data?.error || "Doctor not found");
        }
    };

    const handleConnect = async () => {
        if (!doctorData) return;
        setStatus('connecting');
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post(`${API_URL}/api/connect/doctor/link`,
                { doctor_qr_id: doctorData.doctor_qr_id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatus('success');
            setMessage(res.data.message || "Successfully connected!");
        } catch (err) {
            console.error("Connect Error:", err);
            setStatus('error');
            setMessage(err.response?.data?.message || "Connection Failed");
        }
    };

    return (
        <div className="animate-enter" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#000', color: 'white', zIndex: 2000,
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'white', margin: 0 }}>Connect with Doctor</h2>
                <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={28} />
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

                {status === 'idle' || status === 'searching' || status === 'error' ? (
                    <>
                        <div style={{
                            width: '280px', height: '280px',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '24px', position: 'relative',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            marginBottom: '40px'
                        }}>
                            <Camera size={48} color="rgba(255,255,255,0.5)" />
                            <p style={{ position: 'absolute', bottom: '-40px', width: '100%', textAlign: 'center', color: '#8E8E93' }}>
                                Align QR Code (Mock)
                            </p>
                        </div>

                        <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '20px', padding: '24px' }}>
                            <h3 style={{ color: '#1C1C1E', marginTop: 0, marginBottom: '16px' }}>Enter Doctor ID</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="e.g. DOC-AB12CD"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        border: '1px solid #E5E5EA', fontSize: '16px', outline: 'none',
                                        color: '#333'
                                    }}
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={status === 'searching'}
                                    style={{
                                        background: '#007AFF', color: 'white', border: 'none',
                                        borderRadius: '12px', padding: '0 20px', fontWeight: 600,
                                        cursor: 'pointer', opacity: status === 'searching' ? 0.7 : 1
                                    }}
                                >
                                    {status === 'searching' ? '...' : 'Find'}
                                </button>
                            </div>
                            {status === 'error' && (
                                <p style={{ color: '#FF3B30', marginTop: '12px', fontSize: '14px' }}>{message}</p>
                            )}
                        </div>
                    </>
                ) : (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center' }}
                    >
                        {status === 'success' ? (
                            <>
                                <div style={{ width: '60px', height: '60px', background: '#34C759', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <Check size={32} color="white" />
                                </div>
                                <h2 style={{ color: '#1C1C1E', margin: '0 0 8px' }}>Connected!</h2>
                                <p style={{ color: '#8E8E93', marginBottom: '24px' }}>You are linked with Dr. {doctorData?.name}</p>
                                <button onClick={() => window.history.back()} className="btn-primary" style={{ background: '#007AFF' }}>
                                    Done
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ width: '80px', height: '80px', background: '#E1F0FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <User size={40} color="#007AFF" />
                                </div>
                                <h2 style={{ color: '#1C1C1E', margin: '0 0 4px' }}>{doctorData.name}</h2>
                                <p style={{ color: '#8E8E93', margin: 0, fontWeight: 500 }}>{doctorData.specialization}</p>
                                <p style={{ color: '#AEAEB2', fontSize: '14px', marginTop: '4px' }}>{doctorData.hospital_name}</p>

                                <div style={{ marginTop: '32px' }}>
                                    {doctorData.is_connected ? (
                                        <button
                                            disabled
                                            className="btn-primary"
                                            style={{ background: '#34C759', marginBottom: '12px', cursor: 'default', opacity: 1 }}
                                        >
                                            <Check size={18} style={{ marginRight: '6px' }} />
                                            Already Connected
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleConnect}
                                            disabled={status === 'connecting'}
                                            className="btn-primary"
                                            style={{ background: '#007AFF', marginBottom: '12px' }}
                                        >
                                            {status === 'connecting' ? 'Connecting...' : 'Connect & Share Profile'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => { setStatus('idle'); setDoctorData(null); }}
                                        style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: '16px', fontWeight: 500, cursor: 'pointer' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ScanQR;
