import React, { useState, useEffect, useContext } from 'react';
import { Activity, FileText, Mic, ChevronRight, UserPlus, Bell, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../config';

const Home = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    useEffect(() => {
        fetchConnectedDoctors();
        fetchAppointments();
    }, []);

    const fetchConnectedDoctors = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/connect/patient/doctors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(res.data);
        } catch (err) {
            console.error('Error fetching doctors:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/connect/patient/appointments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(res.data);
        } catch (err) {
            console.error('Error fetching appointments:', err);
        }
    };

    return (
        <div style={{ padding: '20px', paddingBottom: '100px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Welcome back,</p>
                    <h1 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{user?.name || 'Patient'}!</h1>
                </div>
                <div
                    onClick={() => navigate('/profile')}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{user?.name?.[0]?.toUpperCase() || 'P'}</span>
                </div>
            </header>

            {/* Notification Bar */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                    <Bell size={20} style={{ marginRight: '8px' }} />
                    Notifications
                </h3>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>

                    {/* Full Body Checkup Suggestion */}
                    <div className="card" style={{ minWidth: '260px', padding: '16px', background: '#fff1f2', borderLeft: '4px solid var(--accent-color)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-color)' }}>Health Tip</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            Time for a full body checkup? It's recommended every 6 months to stay proactive.
                        </div>
                    </div>

                    {/* Upcoming Appointment Nudges */}
                    {appointments.length > 0 && (
                        <div className="card" style={{ minWidth: '260px', padding: '16px', background: 'var(--primary-light)', borderLeft: '4px solid var(--primary-color)' }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--primary-color)' }}>Upcoming Appointment</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                You have a visit with Dr. {appointments[0].doctor?.name || 'Doctor'} on {new Date(appointments[0].appointment_date).toLocaleDateString()}.
                            </div>
                        </div>
                    )}

                    {/* Report Notification */}
                    <div
                        className="card"
                        onClick={() => navigate('/records')}
                        style={{ minWidth: '260px', padding: '16px', background: '#f0fdf4', borderLeft: '4px solid var(--success-color)', cursor: 'pointer' }}
                    >
                        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--success-color)' }}>Lab Reports</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            Keep track of your health. Click here to view your latest lab reports and prescriptions.
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Score Card */}
            <motion.div
                className="card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)', color: 'white', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: '0 8px 16px -4px rgba(13, 148, 136, 0.3)' }}
            >
                <div>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }}>Overall Health Score</p>
                    <div style={{ fontSize: '48px', fontWeight: '800' }}>85<span style={{ fontSize: '24px' }}>/100</span></div>
                    <p style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0', fontSize: '12px' }}>Everything looks good!</p>
                </div>
                <div style={{ width: '80px', height: '80px', border: '6px solid rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={32} />
                </div>
            </motion.div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <motion.button
                    className="glass-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/records')}
                    style={{ padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', background: 'white', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px', marginBottom: '8px' }}>
                        <FileText color="var(--primary-color)" size={24} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '13px', textAlign: 'center', color: 'var(--text-primary)' }}>Upload Report</span>
                </motion.button>

                <motion.button
                    className="glass-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => navigate('/services')}
                    style={{ padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', background: 'white', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '12px', marginBottom: '8px' }}>
                        <Mic color="var(--accent-color)" size={24} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '13px', textAlign: 'center', color: 'var(--text-primary)' }}>AI Consult</span>
                </motion.button>

                <motion.button
                    className="glass-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => navigate('/family')}
                    style={{ padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', background: 'white', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '12px', marginBottom: '8px' }}>
                        <Users color="var(--warning-color)" size={24} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '13px', textAlign: 'center', color: 'var(--text-primary)' }}>Family Health</span>
                </motion.button>
            </div>

            {/* Connected Doctors Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)' }}>
                    Your Care Team
                </h2>
                <button
                    onClick={() => navigate('/care-team')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    View All <ChevronRight size={16} />
                </button>
            </div>

            {/* Doctors Horizontal Scroll */}
            {loading ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading...
                </div>
            ) : doctors.length === 0 ? (
                <motion.div
                    className="card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate('/scan')}
                    style={{ padding: '24px', textAlign: 'center', cursor: 'pointer', border: '2px dashed #cbd5e1', background: 'var(--bg-color)' }}
                >
                    <UserPlus size={32} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No doctors connected yet</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Tap to link with a doctor</p>
                </motion.div>
            ) : (
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {doctors.map((doc, i) => (
                        <motion.div
                            key={doc.id}
                            className="card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (i * 0.1) }}
                            onClick={() => setSelectedDoctor(doc)}
                            style={{ minWidth: '160px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        >
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: 'var(--primary-light)', marginBottom: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)'
                            }}>
                                {doc.name?.[0]?.toUpperCase() || 'D'}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '14px', textAlign: 'center', color: 'var(--text-primary)' }}>{doc.name || 'Doctor'}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{doc.specialization || 'General'}</span>
                            {doc.hospital_name && (
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>{doc.hospital_name}</span>
                            )}
                        </motion.div>
                    ))}
                    <div
                        onClick={() => navigate('/scan')}
                        style={{ minWidth: '80px', borderRadius: '16px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '16px' }}
                    >
                        <span style={{ fontSize: '24px', color: 'var(--text-secondary)', marginBottom: '4px' }}>+</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Add</span>
                    </div>
                </div>
            )}

            {/* Upcoming Appointments Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px' }}>
                <h2 className="section-title" style={{ margin: 0, color: 'var(--text-primary)' }}>
                    Upcoming Visits
                </h2>
            </div>

            {appointments.length === 0 ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No scheduled appointments
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {appointments.map((apt, i) => (
                        <motion.div
                            key={apt.id}
                            className="card"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            style={{ display: 'flex', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)' }}
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: apt.status === 'CONFIRMED' ? '#dcfce7' : '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '16px' }}>
                                <Activity size={24} color={apt.status === 'CONFIRMED' ? 'var(--success-color)' : 'var(--warning-color)'} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{apt.doctor?.name || 'General Appointment'}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {apt.slot_time || 'TBD'}
                                </div>
                            </div>
                            <div style={{
                                padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold',
                                background: apt.status === 'CONFIRMED' ? '#dcfce7' : '#ffedd5',
                                color: apt.status === 'CONFIRMED' ? 'var(--success-color)' : 'var(--warning-color)'
                            }}>
                                {apt.status}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Quick View Doctor Modal */}
            {selectedDoctor && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1100,
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="card"
                        style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                    {selectedDoctor.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>{selectedDoctor.name}</h2>
                                    <p style={{ margin: 0, color: 'var(--primary-color)', fontWeight: 500 }}>{selectedDoctor.specialization}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDoctor(null)}
                                style={{ background: 'var(--bg-color)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Hospital</div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedDoctor.hospital_name || 'N/A'}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedDoctor.phone || 'N/A'}</div>
                                </div>
                                <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                                    <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{selectedDoctor.email || 'N/A'}</div>
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Doctor ID</div>
                                <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedDoctor.doctor_qr_id}</div>
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={() => {
                                setSelectedDoctor(null);
                                navigate('/care-team');
                            }}
                            style={{ marginTop: '20px', width: '100%' }}
                        >
                            View Full Profile
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Home;
