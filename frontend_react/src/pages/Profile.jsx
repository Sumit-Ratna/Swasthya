import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Edit2, Save, X } from 'lucide-react';
import { API_URL } from '../config';

const Profile = () => {
    const { user, logout, deleteAccount } = useContext(AuthContext);
    const [tab, setTab] = useState('personal');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        gender: '',
        dob: '',
        blood_group: '',
        height: '',
        weight: '',
        marital_status: '',
        address_city: '',
        address_state: '',
        // Doctor specific
        specialization: '',
        hospital_name: '',
        doctor_qr_id: ''
    });

    const [medicalData, setMedicalData] = useState({
        allergies: [],
        current_meds: [],
        chronic_diseases: []
    });

    const [lifestyleData, setLifestyleData] = useState({
        smoking: 'no',
        alcohol: 'no',
        activity_level: 'moderate',
        food_preference: 'veg',
        occupation: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                gender: user.gender || '',
                dob: user.dob || '',
                blood_group: user.blood_group || '',
                height: user.height || '',
                weight: user.weight || '',
                marital_status: user.marital_status || '',
                address_city: user.address_city || '',
                address_state: user.address_state || '',
                specialization: user.specialization || '',
                hospital_name: user.hospital_name || '',
                doctor_qr_id: user.doctor_qr_id || ''
            });
            if (user.medical_history) {
                setMedicalData(user.medical_history);
            }
            if (user.lifestyle) {
                setLifestyleData(user.lifestyle);
            }
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleMedicalChange = (field, value) => {
        setMedicalData({ ...medicalData, [field]: value });
    };

    const handleLifestyleChange = (e) => {
        setLifestyleData({ ...lifestyleData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            let section = 'personal';
            let data = formData;

            if (tab === 'medical') {
                section = 'medical';
                data = medicalData;
            } else if (tab === 'lifestyle') {
                section = 'lifestyle';
                data = lifestyleData;
            }

            const token = localStorage.getItem('accessToken');
            await axios.post(`${API_URL}/api/profile/update`, { section, data }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Profile updated successfully!');
            setEditMode(false);
            // Refresh user data
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Update failed - DB might be unavailable');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#E1F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#007AFF', marginRight: '16px' }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px' }}>{user?.name || 'User Profile'}</h1>
                        <p style={{ margin: '4px 0 0', color: '#8E8E93' }}>
                            {user?.phone ? (user.phone.startsWith('+') ? user.phone : `+91 ${user.phone}`) : 'Unknown'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setEditMode(!editMode)}
                    style={{ background: editMode ? '#FF2D55' : '#007AFF', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', fontWeight: 600 }}
                >
                    {editMode ? <><X size={16} style={{ marginRight: '4px' }} /> Cancel</> : <><Edit2 size={16} style={{ marginRight: '4px' }} /> Edit</>}
                </button>
            </header>

            {/* Segmented Control */}
            <div style={{ display: 'flex', background: '#E5E5EA', padding: '4px', borderRadius: '12px', marginBottom: '24px' }}>
                {(user?.role === 'doctor' ? ['personal'] : ['personal', 'medical', 'lifestyle']).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '10px',
                            borderRadius: '10px',
                            background: tab === t ? 'white' : 'transparent',
                            color: tab === t ? 'black' : '#8E8E93',
                            fontWeight: 600,
                            boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {tab === 'personal' && (
                        <div className="card">
                            <h3 style={{ marginTop: 0 }}>Personal Details</h3>
                            {editMode ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                        />
                                    </div>
                                    {user?.role === 'doctor' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>SPECIALIZATION</label>
                                                <input
                                                    type="text"
                                                    name="specialization"
                                                    value={formData.specialization}
                                                    onChange={handleChange}
                                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>HOSPITAL</label>
                                                <input
                                                    type="text"
                                                    name="hospital_name"
                                                    value={formData.hospital_name}
                                                    onChange={handleChange}
                                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>GENDER</label>
                                            <select name="gender" value={formData.gender} onChange={handleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}>
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>DOB</label>
                                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>BLOOD GROUP</label>
                                            <select name="blood_group" value={formData.blood_group} onChange={handleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}>
                                                <option value="">Select</option>
                                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>HEIGHT (cm)</label>
                                            <input type="number" name="height" value={formData.height} onChange={handleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>WEIGHT (kg)</label>
                                            <input type="number" name="weight" value={formData.weight} onChange={handleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }} />
                                        </div>
                                    </div>
                                    <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Save size={16} style={{ marginRight: '8px' }} /> Save Changes
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {user?.role === 'doctor' && (
                                        <div style={{ background: '#F0FFF4', padding: '16px', borderRadius: '12px', border: '1px solid #27ae60' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div><label style={{ fontSize: '10px', color: '#27ae60', fontWeight: 'bold' }}>SPECIALIZATION</label><div style={{ fontSize: '16px', fontWeight: 600 }}>{formData.specialization}</div></div>
                                                <div><label style={{ fontSize: '10px', color: '#27ae60', fontWeight: 'bold' }}>HOSPITAL</label><div style={{ fontSize: '16px', fontWeight: 600 }}>{formData.hospital_name}</div></div>
                                            </div>
                                            <div><label style={{ fontSize: '10px', color: '#27ae60', fontWeight: 'bold' }}>DOCTOR ID</label><div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{formData.doctor_qr_id}</div></div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div><label style={{ fontSize: '10px', color: '#8E8E93' }}>GENDER</label><div>{formData.gender || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: '#8E8E93' }}>DOB</label><div>{formData.dob || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: '#8E8E93' }}>BLOOD GROUP</label><div>{formData.blood_group || 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: '#8E8E93' }}>HEIGHT</label><div>{formData.height ? `${formData.height} cm` : 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: '#8E8E93' }}>WEIGHT</label><div>{formData.weight ? `${formData.weight} kg` : 'Not Set'}</div></div>
                                        <div><label style={{ fontSize: '10px', color: '#8E8E93' }}>EMAIL</label><div>{formData.email || 'Not Set'}</div></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'medical' && (
                        <div className="card">
                            <h3 style={{ marginTop: 0 }}>Medical History</h3>
                            {editMode ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>ALLERGIES (comma separated)</label>
                                        <input
                                            type="text"
                                            value={(medicalData.allergies || []).join(', ')}
                                            onChange={(e) => handleMedicalChange('allergies', e.target.value.split(',').map(s => s.trim()))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                            placeholder="Penicillin, Peanuts"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>CHRONIC DISEASES</label>
                                        <input
                                            type="text"
                                            value={(medicalData.chronic_diseases || []).join(', ')}
                                            onChange={(e) => handleMedicalChange('chronic_diseases', e.target.value.split(',').map(s => s.trim()))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                                            placeholder="Hypertension, Diabetes"
                                        />
                                    </div>
                                    <button className="btn-primary" onClick={handleSave}><Save size={16} style={{ marginRight: '8px' }} /> Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Allergies</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            {(medicalData.allergies && medicalData.allergies.length > 0) ? medicalData.allergies.map(a => (
                                                <span key={a} style={{ background: '#FFF0F5', color: '#FF2D55', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{a}</span>
                                            )) : <span style={{ color: '#8E8E93' }}>None</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Chronic Diseases</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            {(medicalData.chronic_diseases && medicalData.chronic_diseases.length > 0) ? medicalData.chronic_diseases.map(d => (
                                                <span key={d} style={{ background: '#E1F0FF', color: '#007AFF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{d}</span>
                                            )) : <span style={{ color: '#8E8E93' }}>None</span>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'lifestyle' && (
                        <div className="card">
                            <h3 style={{ marginTop: 0 }}>Lifestyle</h3>
                            {editMode ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>SMOKING</label>
                                        <select name="smoking" value={lifestyleData.smoking} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}>
                                            <option value="no">No</option>
                                            <option value="occasionally">Occasionally</option>
                                            <option value="regularly">Regularly</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>ALCOHOL</label>
                                        <select name="alcohol" value={lifestyleData.alcohol} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}>
                                            <option value="no">No</option>
                                            <option value="occasionally">Occasionally</option>
                                            <option value="regularly">Regularly</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>ACTIVITY LEVEL</label>
                                        <select name="activity_level" value={lifestyleData.activity_level} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}>
                                            <option value="sedentary">Sedentary</option>
                                            <option value="moderate">Moderate</option>
                                            <option value="active">Active</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>DIET PREFERENCE</label>
                                        <select name="food_preference" value={lifestyleData.food_preference} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }}>
                                            <option value="veg">Vegetarian</option>
                                            <option value="non-veg">Non-Vegetarian</option>
                                            <option value="egg">Eggetarian</option>
                                            <option value="vegan">Vegan</option>
                                            <option value="mixed">Mixed</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93' }}>OCCUPATION</label>
                                        <input name="occupation" value={lifestyleData.occupation} onChange={handleLifestyleChange} style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px' }} />
                                    </div>
                                    <button className="btn-primary" onClick={handleSave}><Save size={16} style={{ marginRight: '8px' }} /> Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
                                        <span>Diet</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.food_preference || 'Standard'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
                                        <span>Smoking</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.smoking || 'No'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F2F2F7' }}>
                                        <span>Alcohol</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.alcohol || 'No'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                        <span>Physical Activity</span><b style={{ textTransform: 'capitalize' }}>{lifestyleData.activity_level || 'Moderate'}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #F2F2F7' }}>
                                        <span>Occupation</span><b>{lifestyleData.occupation || 'Not Set'}</b>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <button
                onClick={logout}
                style={{ width: '100%', marginTop: '24px', padding: '14px', background: '#FF2D55', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600 }}
            >
                Log Out
            </button>

            <button
                onClick={() => {
                    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                        deleteAccount();
                    }
                }}
                style={{ width: '100%', marginTop: '12px', padding: '14px', background: 'transparent', color: '#FF3B30', border: '1px solid #FF3B30', borderRadius: '12px', fontWeight: 600 }}
            >
                Delete Account
            </button>
        </div>
    );
};

export default Profile;
