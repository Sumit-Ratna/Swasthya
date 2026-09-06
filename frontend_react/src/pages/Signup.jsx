import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, AtSign, Lock, User, Calendar, Activity, Briefcase, Building } from 'lucide-react';

const Signup = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const initialRole = location.state?.role || 'patient';

    const [role, setRole] = useState(initialRole);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        dob: '',
        gender: 'Male',
        blood_group: 'O+',
        specialization: '',
        hospital_name: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateAge = (dob) => {
        if (!dob) return '';
        const today = new Date();
        const birthDate = new Date(dob);
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();

        if (days < 0) {
            months--;
            days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        return `${years} Years, ${months} Months, ${days} Days`;
    };

    const handleRegister = async () => {
        setError('');
        setLoading(true);
        try {
            const payload = {
                role,
                name: formData.name,
                phone: formData.phone || undefined,
                email: formData.email || undefined,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                dob: formData.dob || undefined,
                gender: formData.gender,
                blood_group: role === 'patient' ? formData.blood_group : undefined,
                specialization: role === 'doctor' ? formData.specialization : undefined,
                hospital_name: role === 'doctor' ? formData.hospital_name : undefined
            };

            await register(payload);

            if (role === 'doctor') {
                navigate('/doctor/dashboard');
            } else {
                navigate('/home');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Registration failed. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'var(--bg-color)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}
            >
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        background: 'var(--primary-color)',
                        borderRadius: '12px',
                        margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white'
                    }}>
                        <Activity size={24} />
                    </div>
                    <h1 style={{ color: 'var(--text-primary)' }}>Create your account</h1>
                    <p style={{ marginTop: '8px' }}>Join HealthNexus to manage your care journey</p>
                </div>

                <div className="card" style={{ padding: '32px 24px', textAlign: 'left', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                    {error && (
                        <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '20px', background: '#fee2e2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            {error}
                        </div>
                    )}

                    {/* Role Picker */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ marginBottom: '10px' }}>I am a…</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {['patient', 'doctor'].map((r) => (
                                <button
                                    key={r}
                                    id={`role-${r}`}
                                    onClick={() => setRole(r)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: role === r ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        background: role === r ? 'var(--primary-light)' : 'white',
                                        color: role === r ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Full Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <label>Full Name *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="signup-name"
                                type="text"
                                name="name"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                style={{ paddingLeft: '44px' }}
                                autoComplete="name"
                            />
                            <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                    </div>

                    {/* Phone (optional) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label>Phone Number <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>(optional if email provided)</span></label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="signup-phone"
                                type="tel"
                                name="phone"
                                placeholder="e.g. +1 234 567 8900"
                                value={formData.phone}
                                onChange={handleChange}
                                style={{ paddingLeft: '44px' }}
                                autoComplete="tel"
                            />
                            <Phone size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                    </div>

                    {/* Email (optional) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label>Email Address <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>(optional if phone provided)</span></label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="signup-email"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                style={{ paddingLeft: '44px' }}
                                autoComplete="email"
                            />
                            <AtSign size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label>Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="signup-password"
                                    type="password"
                                    name="password"
                                    placeholder="Min. 8 chars"
                                    value={formData.password}
                                    onChange={handleChange}
                                    style={{ paddingLeft: '44px' }}
                                    autoComplete="new-password"
                                />
                                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                        </div>
                        <div>
                            <label>Confirm *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="signup-confirm-password"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Repeat password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    style={{ paddingLeft: '44px' }}
                                    autoComplete="new-password"
                                />
                                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                        </div>
                    </div>

                    {/* DoB + Gender */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label>Date of Birth</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="signup-dob"
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    style={{ paddingLeft: '44px' }}
                                />
                                <Calendar size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                            {formData.dob && <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginTop: '4px' }}>Age: {calculateAge(formData.dob)}</div>}
                        </div>
                        <div>
                            <label>Gender</label>
                            <select id="signup-gender" name="gender" value={formData.gender} onChange={handleChange}>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Doctor-specific fields */}
                    {role === 'doctor' && (
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                <label>Specialization</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="signup-specialization"
                                        type="text"
                                        name="specialization"
                                        placeholder="e.g. Cardiologist"
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        style={{ paddingLeft: '44px' }}
                                    />
                                    <Briefcase size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label>Hospital / Clinic</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="signup-hospital"
                                        type="text"
                                        name="hospital_name"
                                        placeholder="e.g. City Hospital"
                                        value={formData.hospital_name}
                                        onChange={handleChange}
                                        style={{ paddingLeft: '44px' }}
                                    />
                                    <Building size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Patient-specific fields */}
                    {role === 'patient' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label>Blood Group</label>
                            <select id="signup-blood-group" name="blood_group" value={formData.blood_group} onChange={handleChange}>
                                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg}>{bg}</option>)}
                            </select>
                        </div>
                    )}

                    <button
                        id="signup-submit"
                        className="btn-primary"
                        onClick={handleRegister}
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Creating account…' : 'Complete Registration'}
                    </button>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Already have an account?{' '}
                        <span
                            onClick={() => navigate(role === 'doctor' ? '/login/doctor' : '/login/patient')}
                            style={{ color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Log in
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
