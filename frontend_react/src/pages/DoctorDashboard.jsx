import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Users, Calendar, FileText, Activity, User, Pill, Stethoscope, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const DoctorDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState({ patientCount: 0, todayAppointments: 0 });
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/');
            return;
        }
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const headers = { Authorization: `Bearer ${token}` };
            const statsRes = await axios.get(`${API_URL}/api/doctor/dashboard`, { headers });
            setStats(statsRes.data);

            const patientsRes = await axios.get(`${API_URL}/api/doctor/patients`, { headers });
            setPatients(patientsRes.data);
        } catch (err) {
            console.error('Error fetching doctor data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 className="animate-enter" style={{ color: 'var(--text-primary)' }}>Doctor Dashboard</h1>
                <p className="animate-enter" style={{ animationDelay: '0.1s', color: 'var(--text-secondary)' }}>
                    Welcome, Dr. {user?.name}
                </p>
            </header>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                        <Users size={24} color="var(--primary-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{stats.patientCount}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Patients</div>
                    </div>
                </motion.div>

                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', padding: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                        <Calendar size={24} color="var(--success-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success-color)' }}>{stats.todayAppointments}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Today's Appointments</div>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/doctor/patients')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Users size={18} style={{ marginRight: '8px' }} />
                    View Patients
                </button>
                <button
                    onClick={() => navigate('/doctor/prescribe')}
                    style={{ background: 'var(--success-color)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Pill size={18} style={{ marginRight: '8px' }} />
                    Prescribe Medicine
                </button>
                <button
                    onClick={() => navigate('/doctor/diagnosis')}
                    style={{ background: 'var(--warning-color)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Stethoscope size={18} style={{ marginRight: '8px' }} />
                    Add Diagnosis
                </button>
                <button
                    onClick={() => navigate('/doctor/qr')}
                    style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <QrCode size={18} style={{ marginRight: '8px' }} />
                    My QR Code
                </button>
            </div>

            {/* Recent Patients */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Recent Patients</h3>
                    {patients.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>
                            <User size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No patients linked yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {patients.slice(0, 5).map((patient, index) => (
                                <motion.div
                                    key={patient.id}
                                    className="card"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                                    style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', fontSize: '16px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                        {patient.name?.[0]?.toUpperCase() || 'P'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>{patient.name || 'Unknown Patient'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {patient.phone ? (patient.phone.startsWith('+') ? patient.phone : `+91 ${patient.phone}`) : 'Unknown'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px 10px', background: 'var(--bg-color)', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        View
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Recent Reports Issued</h3>
                    {!stats.recentActivity || stats.recentActivity.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>
                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No reports issued yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {stats.recentActivity.map((doc, index) => (
                                <motion.div
                                    key={doc.id}
                                    className="card"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => navigate(`/doctor/patient/${doc.patient_id}`)}
                                    style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', borderLeft: `4px solid ${doc.type === 'prescription' ? 'var(--success-color)' : (doc.type === 'diagnosis_note' ? 'var(--warning-color)' : 'var(--primary-color)')}`, borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>
                                            {doc.type === 'prescription' ? 'Prescription' : (doc.type === 'diagnosis_note' ? 'Diagnosis' : 'Lab Report')}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            For {doc.patient?.name || 'Patient'} • {new Date(doc.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                                        <Activity size={16} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
