import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
    Calendar,
    Clock,
    User,
    CheckCircle,
    ArrowLeft,
    AlertCircle,
    Stethoscope,
    Building2,
    ShieldCheck,
    Scan
} from 'lucide-react';
import { API_URL } from '../config';

const APPOINTMENT_TYPES = [
    { id: 'Consultation', label: 'Consultation', desc: 'Detailed doctor consultation' },
    { id: 'Follow-up', label: 'Follow-up', desc: 'Review treatment progress' },
    { id: 'Routine Checkup', label: 'Routine Checkup', desc: 'Regular health assessment' },
    { id: 'Specialist Review', label: 'Specialist Review', desc: 'In-depth clinical opinion' }
];

const TIME_SLOTS = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM'
];

const BookAppointment = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedDoctorId = searchParams.get('doctorId');

    const [doctors, setDoctors] = useState([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [selectedDoctorId, setSelectedDoctorId] = useState(preselectedDoctorId || '');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [selectedType, setSelectedType] = useState('Consultation');
    const [symptoms, setSymptoms] = useState('');
    const [notes, setNotes] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);

    // Minimum date is today
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (user && user.role !== 'patient') {
            navigate('/doctor/dashboard');
            return;
        }
        fetchDoctors();
    }, [user, navigate]);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/connect/patient/doctors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(res.data || []);
            if (preselectedDoctorId) {
                setSelectedDoctorId(preselectedDoctorId);
            } else if (res.data?.length === 1) {
                setSelectedDoctorId(res.data[0].id);
            }
        } catch (err) {
            console.error('Error fetching connected doctors:', err);
            setError('Could not load connected doctors');
        } finally {
            setLoadingDoctors(false);
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        if (!selectedDoctorId) {
            setError('Please select a doctor for the appointment.');
            return;
        }
        if (!selectedDate) {
            setError('Please select an appointment date.');
            return;
        }
        if (!selectedSlot) {
            setError('Please select a time slot.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('accessToken');
            const payload = {
                doctor_id: selectedDoctorId,
                appointment_date: selectedDate,
                appointment_time: selectedSlot,
                type: selectedType,
                symptoms,
                notes
            };

            const res = await axios.post(`${API_URL}/api/appointments/book/scheduled`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccessData(res.data.appointment);
        } catch (err) {
            console.error('Booking failed:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to book appointment';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

    if (successData) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
                <motion.div
                    className="card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ padding: '32px 24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}
                >
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <CheckCircle size={36} color="#059669" />
                    </div>

                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Appointment Confirmed!
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Your {successData.type || 'consultation'} has been scheduled with Dr. {successData.doctor?.name || selectedDoctor?.name || 'Doctor'}.
                    </p>

                    <div style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'left', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Doctor:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dr. {successData.doctor?.name || selectedDoctor?.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Specialization:</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{successData.doctor?.specialization || selectedDoctor?.specialization || 'General'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                            <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{new Date(successData.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Time Slot:</span>
                            <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{successData.appointment_time || successData.slot_time}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                            <span style={{ fontWeight: 600, color: '#059669' }}>{successData.type}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/status')}
                            style={{
                                flex: 1,
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            View in Status
                        </button>
                        <button
                            onClick={() => navigate('/home')}
                            style={{
                                flex: 1,
                                background: 'var(--bg-color)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Back Home
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '650px', margin: '0 auto', minHeight: '100vh', paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Book Appointment
                    </h1>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Pick a date and time slot with your connected physician
                    </p>
                </div>
            </div>

            {error && (
                <div style={{
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px',
                    border: '1px solid #fecaca',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px'
                }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleBooking}>
                {/* 1. Select Connected Doctor */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        1. Select Connected Doctor
                    </label>

                    {loadingDoctors ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Loading connected doctors...
                        </div>
                    ) : doctors.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                You do not have any connected doctors yet. Scan your doctor's QR code to link.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/scan')}
                                style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Scan size={14} /> Scan Doctor QR
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {doctors.map((doc) => {
                                const isSelected = selectedDoctorId === doc.id;
                                return (
                                    <div
                                        key={doc.id}
                                        onClick={() => setSelectedDoctorId(doc.id)}
                                        style={{
                                            padding: '14px',
                                            borderRadius: 'var(--radius-md)',
                                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--primary-light)',
                                                color: isSelected ? 'white' : 'var(--primary-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '16px'
                                            }}>
                                                {doc.name?.[0]?.toUpperCase() || 'D'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    Dr. {doc.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {doc.specialization || 'General Physician'} • {doc.hospital_name || 'HealthNexus'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            border: isSelected ? '5px solid var(--primary-color)' : '2px solid var(--border-color)',
                                            boxSizing: 'border-box'
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Select Appointment Type */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        2. Consultation Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {APPOINTMENT_TYPES.map((t) => {
                            const isSelected = selectedType === t.id;
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedType(t.id)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                                        {t.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {t.desc}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Pick Date & Time Slot */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        3. Pick Date & Time
                    </label>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Appointment Date
                        </label>
                        <input
                            type="date"
                            min={today}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Available Time Slots
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                            {TIME_SLOTS.map((slot) => {
                                const isSelected = selectedSlot === slot;
                                return (
                                    <button
                                        type="button"
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        style={{
                                            padding: '10px 4px',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                            backgroundColor: isSelected ? 'var(--primary-color)' : 'white',
                                            color: isSelected ? 'white' : 'var(--text-primary)',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {slot}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 4. Symptoms / Notes */}
                <div className="card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        4. Reason for Visit (Optional)
                    </label>

                    <input
                        type="text"
                        placeholder="Key symptoms (e.g., severe migraine, high blood pressure)"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '14px',
                            marginBottom: '10px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />

                    <textarea
                        placeholder="Additional notes for your doctor..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting || !selectedDoctorId || !selectedDate || !selectedSlot}
                    style={{
                        width: '100%',
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: (submitting || !selectedDoctorId || !selectedDate || !selectedSlot) ? 'not-allowed' : 'pointer',
                        opacity: (submitting || !selectedDoctorId || !selectedDate || !selectedSlot) ? 0.6 : 1,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                        transition: 'all 0.2s'
                    }}
                >
                    {submitting ? 'Confirming Booking...' : 'Confirm Scheduled Appointment'}
                </button>
            </form>
        </div>
    );
};

export default BookAppointment;
