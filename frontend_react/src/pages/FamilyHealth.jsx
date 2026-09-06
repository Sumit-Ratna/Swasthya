import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Plus, X, ChevronRight, User, Phone, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

const FamilyHealth = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [step, setStep] = useState('phone'); // 'phone' or 'password'
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [memberPassword, setMemberPassword] = useState('');
    const [memberName, setMemberName] = useState('');
    const [relation, setRelation] = useState('Family');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) fetchFamilyMembers();
    }, [user]);

    const fetchFamilyMembers = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/family/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data);
        } catch (err) {
            console.error("Fetch members error:", err);
        }
    };

    const handleInitiate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post(`${API_URL}/api/family/add`, {
                phone: newMemberPhone,
                relation: relation
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMemberName(res.data.member_name || '');
            setStep('password');
        } catch (err) {
            console.error("Family Add Error:", err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to initiate family link';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(`${API_URL}/api/family/verify`, {
                phone: newMemberPhone,
                password: memberPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchFamilyMembers();
            closeModal();
            alert('Family member connected successfully!');
        } catch (err) {
            console.error("Family verify error:", err);
            const errMsg = err.response?.data?.error || err.message || 'Verification failed';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setStep('phone');
        setNewMemberPhone('');
        setMemberPassword('');
        setMemberName('');
        setRelation('Family');
        setError('');
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this family member?")) return;
        try {
            const token = localStorage.getItem('accessToken');
            await axios.delete(`${API_URL}/api/family/${memberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFamilyMembers();
        } catch (err) {
            alert("Failed to remove member");
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="animate-enter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={28} color="#007AFF" />
                        Family Health
                    </h1>
                    <p className="animate-enter" style={{ animationDelay: '0.1s', color: '#8E8E93', margin: '4px 0 0' }}>
                        Manage health records for your family members
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={18} /> Add Member
                </button>
            </header>

            {/* Members List */}
            <div style={{ display: 'grid', gap: '16px' }}>
                {members.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                        <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No family members connected yet.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{ marginTop: '16px', color: '#007AFF', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                            + Add your first family member
                        </button>
                    </div>
                ) : (
                    members.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="card"
                            style={{
                                display: 'flex', alignItems: 'center', padding: '16px',
                                cursor: 'pointer', transition: 'transform 0.2s', position: 'relative'
                            }}
                            onClick={() => navigate(`/family/${member.id}`)}
                            whileHover={{ scale: 1.01 }}
                        >
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: `linear-gradient(135deg, ${['#FF9500', '#FF2D55', '#5856D6', '#007AFF'][index % 4]} 0%, #FFF 100%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginRight: '16px', color: 'white', fontWeight: 'bold', fontSize: '20px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}>
                                {member.name?.[0]?.toUpperCase() || 'U'}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{member.name}</h3>
                                    <span style={{
                                        fontSize: '11px', background: '#E5E5EA', color: '#636366',
                                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600, textTransform: 'uppercase'
                                    }}>
                                        {member.relation}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: '#8E8E93', fontSize: '13px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Phone size={12} /> {member.phone}
                                    </span>
                                    {member.dob && <span>Age: {new Date().getFullYear() - new Date(member.dob).getFullYear()}</span>}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(member.id);
                                }}
                                style={{
                                    padding: '8px', background: 'transparent',
                                    color: '#C7C7CC', border: 'none', cursor: 'pointer',
                                    borderRadius: '50%',
                                }}
                                title="Remove member"
                            >
                                <X size={20} />
                            </button>

                            <ChevronRight size={20} color="#C7C7CC" style={{ marginLeft: '8px' }} />
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>Add Family Member</h3>
                                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="#8E8E93" />
                                </button>
                            </div>

                            <form onSubmit={step === 'phone' ? handleInitiate : handleVerify}>
                                {step === 'phone' ? (
                                    <>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                                PHONE NUMBER
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="Enter their registered phone"
                                                value={newMemberPhone}
                                                onChange={(e) => setNewMemberPhone(e.target.value)}
                                                required
                                                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA' }}
                                            />
                                            <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px' }}>
                                                Note: The family member must already have an account on HealthNexus.
                                            </p>
                                        </div>
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                                RELATIONSHIP
                                            </label>
                                            <select
                                                value={relation}
                                                onChange={(e) => setRelation(e.target.value)}
                                                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA' }}
                                            >
                                                <option value="Family">Family</option>
                                                <option value="Mother">Mother</option>
                                                <option value="Father">Father</option>
                                                <option value="Spouse">Spouse</option>
                                                <option value="Son">Son</option>
                                                <option value="Daughter">Daughter</option>
                                                <option value="Sibling">Sibling</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                            <div style={{
                                                width: '50px', height: '50px', borderRadius: '50%', background: '#E1F0FF',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
                                            }}>
                                                <Lock size={24} color="#007AFF" />
                                            </div>
                                            <h4 style={{ margin: '0 0 4px' }}>Authorize Connection</h4>
                                            <p style={{ fontSize: '13px', color: '#8E8E93', margin: 0 }}>
                                                Enter the password for {memberName ? <strong>{memberName}</strong> : newMemberPhone} to confirm permission.
                                            </p>
                                        </div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                            MEMBER'S PASSWORD
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Enter their password"
                                            value={memberPassword}
                                            onChange={(e) => setMemberPassword(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA' }}
                                        />
                                    </div>
                                )}

                                {error && (
                                    <div style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '16px', background: '#FFF0F0', padding: '10px', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                    style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                >
                                    {loading ? 'Processing...' : (step === 'phone' ? 'Next: Enter Password' : 'Confirm & Connect')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FamilyHealth;
