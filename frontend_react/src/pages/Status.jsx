import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Ticket, Plus, User, Stethoscope } from 'lucide-react';
import { API_URL } from '../config';

const Status = () => {
    const [appointments, setAppointments] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/appointments/my-list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(res.data);
        } catch (err) {
            console.log("No appointments yet or auth error");
        }
    };

    return (
        <div style={{ padding: '20px', paddingBottom: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h1 className="animate-enter" style={{ margin: 0 }}>Status Dashboard</h1>
                <button
                    onClick={() => navigate('/appointments/book')}
                    style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={14} /> Book Slot
                </button>
            </div>

            {/* OPD Queue Slip */}
            <motion.div
                className="card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderLeft: '5px solid #007AFF', background: '#F2F2F7', marginBottom: '24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>OPD Queue Slip</h3>
                    <Ticket color="#007AFF" />
                </div>
                <div style={{ margin: '16px 0', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#8E8E93' }}>YOUR NUMBER</span>
                    <div style={{ fontSize: '48px', fontWeight: '800', color: '#007AFF' }}>24</div>
                    <span style={{ fontSize: '12px', color: '#8E8E93' }}>EST. WAIT: 15 MINS</span>
                </div>
                <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dr. Sharma (Gen. Med)</span>
                    <span>Room 104</span>
                </div>
            </motion.div>

            {/* Appointments List */}
            <h3 style={{ marginBottom: '12px' }}>Upcoming Appointments</h3>
            {appointments.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#8E8E93' }}>
                    <p style={{ margin: '0 0 12px' }}>No upcoming booked appointments.</p>
                    <button
                        onClick={() => navigate('/appointments/book')}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Book a Scheduled Appointment
                    </button>
                </div>
            ) : (
                appointments.map((apt, i) => (
                    <motion.div
                        key={apt.id || i}
                        className="card"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{ marginBottom: '12px', padding: '16px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)' }}>
                                    {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : (apt.type || 'Consultation')}
                                </h4>
                                {apt.doctor?.specialization && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {apt.doctor.specialization}
                                    </div>
                                )}
                            </div>
                            <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: apt.type === 'OPD' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: apt.type === 'OPD' ? '#007AFF' : '#059669'
                            }}>
                                {apt.type || 'Consultation'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: '#8E8E93', marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Calendar size={13} style={{ marginRight: '5px' }} />
                                {apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : 'N/A'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Clock size={13} style={{ marginRight: '5px' }} />
                                {apt.appointment_time || apt.slot_time || '10:00 AM'}
                            </div>
                        </div>

                        {apt.symptoms && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '6px 10px', borderRadius: '6px' }}>
                                <b>Reason:</b> {apt.symptoms}
                            </div>
                        )}
                    </motion.div>
                ))
            )}
        </div>
    );
};

export default Status;
