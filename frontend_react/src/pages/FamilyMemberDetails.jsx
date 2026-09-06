import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Records from './Records';
import { ArrowLeft, User, Activity, Shield, ShieldCheck, ShieldOff, Info } from 'lucide-react';
import { API_URL } from '../config';

const FamilyMemberDetails = () => {
    const { memberId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [accessLevel, setAccessLevel] = useState('full');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user && memberId) {
            fetchMemberDetails();
        }
    }, [user, memberId]);

    const fetchMemberDetails = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`${API_URL}/api/family/${memberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Result structure: { member: { ... }, documents: [], appointments: [], relation: string, access_level: string }
            setMember({ ...res.data.member, relation: res.data.relation });
            setAccessLevel(res.data.access_level || 'full');
            setLoading(false);
        } catch (err) {
            console.error("Fetch member error:", err);
            setError("Failed to load family member details.");
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading member...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

    const getAccessBanner = () => {
        if (accessLevel === 'none') {
            return {
                bg: 'linear-gradient(135deg, #FFF0F0 0%, #FFE5E5 100%)',
                border: '#FFD0D0',
                icon: <ShieldOff size={20} color="#C62828" />,
                color: '#C62828',
                text: 'Health records sharing has not been enabled by this family member. Only profile information is visible.',
                subtext: 'The member can grant access from their Family Health settings.'
            };
        }
        if (accessLevel === 'selected') {
            return {
                bg: 'linear-gradient(135deg, #FFF8F0 0%, #FFF3E0 100%)',
                border: '#FFE0B2',
                icon: <Shield size={20} color="#E65100" />,
                color: '#E65100',
                text: 'This member has shared only selected health records with you.',
                subtext: 'Some documents may not be visible based on their sharing preferences.'
            };
        }
        return null;
    };

    const banner = getAccessBanner();

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/family')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '16px', display: 'flex' }}
                >
                    <ArrowLeft size={24} color="#333" />
                </button>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#FF9500', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                        }}>
                            {member?.name?.[0] || 'U'}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {member?.name}
                                {/* Access level badge */}
                                {accessLevel === 'full' && (
                                    <span style={{
                                        fontSize: '11px', background: '#E8F5E9', color: '#2E7D32',
                                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: '3px'
                                    }}>
                                        <ShieldCheck size={11} /> Full Access
                                    </span>
                                )}
                                {accessLevel === 'selected' && (
                                    <span style={{
                                        fontSize: '11px', background: '#FFF3E0', color: '#E65100',
                                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: '3px'
                                    }}>
                                        <Shield size={11} /> Partial Access
                                    </span>
                                )}
                                {accessLevel === 'none' && (
                                    <span style={{
                                        fontSize: '11px', background: '#FFEBEE', color: '#C62828',
                                        padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: '3px'
                                    }}>
                                        <ShieldOff size={11} /> No Access
                                    </span>
                                )}
                            </h2>
                            <div style={{ fontSize: '12px', color: '#8E8E93' }}>{member?.relation || 'Family Member'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Access restriction banner */}
            {banner && (
                <div style={{
                    background: banner.bg,
                    border: `1px solid ${banner.border}`,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                }}>
                    {banner.icon}
                    <div>
                        <div style={{ fontWeight: 600, color: banner.color, fontSize: '14px', marginBottom: '4px' }}>
                            {banner.text}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8E8E93' }}>
                            {banner.subtext}
                        </div>
                    </div>
                </div>
            )}

            {/* Reusing Records Component for this member */}
            {accessLevel !== 'none' ? (
                <div style={{ background: '#F2F2F7', margin: '-20px', padding: '20px', minHeight: 'calc(100vh - 80px)' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={20} color="#007AFF" />
                            Medical Records for {member?.name}
                        </h3>
                        <Records viewingPatientId={memberId} />
                    </div>
                </div>
            ) : (
                <div style={{
                    background: '#F2F2F7', margin: '-20px', padding: '20px',
                    minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ textAlign: 'center', color: '#8E8E93' }}>
                        <ShieldOff size={48} style={{ opacity: 0.4, marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 500 }}>No health records available</p>
                        <p style={{ fontSize: '13px', maxWidth: '300px', margin: '8px auto 0' }}>
                            This family member has not shared any health records with you yet. They can update their sharing preferences anytime.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyMemberDetails;
