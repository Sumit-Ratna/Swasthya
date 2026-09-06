import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Plus, X, ChevronRight, Phone, Lock, Shield, ShieldCheck, ShieldOff, FileText, Check, Clock, UserPlus, UserX, Settings, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

const FamilyHealth = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Connected members
    const [members, setMembers] = useState([]);

    // Connection Requests
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);

    // Add member modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [step, setStep] = useState('identifier'); // 'identifier' or 'password'
    const [newMemberIdentifier, setNewMemberIdentifier] = useState('');
    const [memberPassword, setMemberPassword] = useState('');
    const [memberName, setMemberName] = useState('');
    const [relation, setRelation] = useState('Family');

    // Permission modal (for accepting a request or managing existing member)
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [permissionMode, setPermissionMode] = useState('accept'); // 'accept' or 'manage'
    const [selectedRequest, setSelectedRequest] = useState(null); // for accept mode
    const [selectedMemberForPerms, setSelectedMemberForPerms] = useState(null); // for manage mode
    const [permissionAccessLevel, setPermissionAccessLevel] = useState('full');
    const [myDocuments, setMyDocuments] = useState([]);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(''); // linkId being acted on

    const token = localStorage.getItem('accessToken');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // ──────────────────────── Data fetching ────────────────────────
    const fetchFamilyMembers = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/family/list`, authHeaders);
            setMembers(res.data);
        } catch (err) {
            console.error("Fetch members error:", err);
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/family/requests`, authHeaders);
            setIncomingRequests(res.data.incoming || []);
            setOutgoingRequests(res.data.outgoing || []);
        } catch (err) {
            console.error("Fetch requests error:", err);
        }
    }, []);

    const fetchMyDocuments = useCallback(async () => {
        setLoadingDocs(true);
        try {
            const res = await axios.get(`${API_URL}/api/documents/patient/${user.id}`, authHeaders);
            setMyDocuments(res.data || []);
        } catch (err) {
            console.error("Fetch docs error:", err);
            setMyDocuments([]);
        } finally {
            setLoadingDocs(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchFamilyMembers();
            fetchRequests();
        }
    }, [user]);

    // ──────────────────────── Add member flow ────────────────────────
    const handleInitiate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/family/add`, {
                identifier: newMemberIdentifier.trim(),
                phone: newMemberIdentifier.trim(),
                relation
            }, authHeaders);
            setMemberName(res.data.member_name || '');
            // After sending request, refresh outgoing
            fetchRequests();
            closeAddModal();
            alert(`Connection request sent to ${res.data.member_name || newMemberIdentifier}! They will need to accept it.`);
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Failed to send request';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setStep('identifier');
        setNewMemberIdentifier('');
        setMemberPassword('');
        setMemberName('');
        setRelation('Family');
        setError('');
    };

    // ──────────────────────── Request responses ────────────────────────
    const handleAcceptRequest = (request) => {
        setSelectedRequest(request);
        setPermissionMode('accept');
        setPermissionAccessLevel('full');
        setSelectedDocIds([]);
        setShowPermissionModal(true);
        fetchMyDocuments();
    };

    const handleDeclineRequest = async (linkId) => {
        if (!window.confirm("Are you sure you want to decline this connection request?")) return;
        setActionLoading(linkId);
        try {
            await axios.post(`${API_URL}/api/family/requests/${linkId}/respond`, {
                action: 'reject'
            }, authHeaders);
            fetchRequests();
        } catch (err) {
            alert("Failed to decline request: " + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading('');
        }
    };

    // ──────────────────────── Permission modal submit ────────────────────────
    const handlePermissionSubmit = async () => {
        setLoading(true);
        try {
            if (permissionMode === 'accept') {
                await axios.post(`${API_URL}/api/family/requests/${selectedRequest.linkId}/respond`, {
                    action: 'accept',
                    access_level: permissionAccessLevel,
                    allowed_document_ids: permissionAccessLevel === 'selected' ? selectedDocIds : []
                }, authHeaders);
                fetchRequests();
                fetchFamilyMembers();
            } else {
                // manage mode
                await axios.patch(`${API_URL}/api/family/permissions/${selectedMemberForPerms.id}`, {
                    access_level: permissionAccessLevel,
                    allowed_document_ids: permissionAccessLevel === 'selected' ? selectedDocIds : []
                }, authHeaders);
                fetchFamilyMembers();
            }
            closePermissionModal();
        } catch (err) {
            alert("Failed to update permissions: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const closePermissionModal = () => {
        setShowPermissionModal(false);
        setSelectedRequest(null);
        setSelectedMemberForPerms(null);
        setPermissionAccessLevel('full');
        setSelectedDocIds([]);
        setMyDocuments([]);
    };

    // ──────────────────────── Manage permissions for existing member ────────────────────────
    const handleManagePermissions = (member) => {
        setSelectedMemberForPerms(member);
        setPermissionMode('manage');
        const myPerms = member.myGrantedPermissions || {};
        setPermissionAccessLevel(myPerms.access_level || 'full');
        setSelectedDocIds(myPerms.allowed_document_ids || []);
        setShowPermissionModal(true);
        fetchMyDocuments();
    };

    // ──────────────────────── Remove member ────────────────────────
    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this family member?")) return;
        try {
            await axios.delete(`${API_URL}/api/family/${memberId}`, authHeaders);
            fetchFamilyMembers();
        } catch (err) {
            alert("Failed to remove member");
        }
    };

    // ──────────────────────── Doc checkbox toggle ────────────────────────
    const toggleDocSelection = (docId) => {
        setSelectedDocIds(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    // ──────────────────────── Permission badge helper ────────────────────────
    const getPermissionBadge = (accessLevel) => {
        const map = {
            full: { label: 'Full Access', bg: '#E8F5E9', color: '#2E7D32', icon: <ShieldCheck size={12} /> },
            selected: { label: 'Partial Access', bg: '#FFF3E0', color: '#E65100', icon: <Shield size={12} /> },
            none: { label: 'No Access', bg: '#FFEBEE', color: '#C62828', icon: <ShieldOff size={12} /> }
        };
        return map[accessLevel] || map.full;
    };

    // ──────────────────────── Render ────────────────────────
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

            {/* ═══════════ INCOMING REQUESTS ═══════════ */}
            {incomingRequests.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '24px' }}
                >
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#007AFF' }}>
                        <UserPlus size={20} />
                        Incoming Connection Requests ({incomingRequests.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {incomingRequests.map((req, i) => (
                            <motion.div
                                key={req.linkId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="card"
                                style={{
                                    padding: '16px',
                                    border: '2px solid #007AFF20',
                                    background: 'linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 100%)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 'bold', fontSize: '18px'
                                        }}>
                                            {req.requester?.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                                {req.requester?.name || 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                                <span>{req.relation}</span>
                                                {req.requester?.phone && <span>• {req.requester.phone}</span>}
                                                {req.requester?.email && <span>• {req.requester.email}</span>}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#C7C7CC', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={10} />
                                                Wants to connect with you
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleAcceptRequest(req)}
                                            disabled={actionLoading === req.linkId}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                                background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                boxShadow: '0 2px 8px rgba(52,199,89,0.3)'
                                            }}
                                            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; }}
                                            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                                        >
                                            <ShieldCheck size={14} /> Accept & Set Permissions
                                        </button>
                                        <button
                                            onClick={() => handleDeclineRequest(req.linkId)}
                                            disabled={actionLoading === req.linkId}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px',
                                                border: '1px solid #FF3B30', background: 'white',
                                                color: '#FF3B30', fontWeight: 600, cursor: 'pointer',
                                                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px',
                                                transition: 'transform 0.2s'
                                            }}
                                            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; }}
                                            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                                        >
                                            <UserX size={14} /> Decline
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ═══════════ OUTGOING REQUESTS ═══════════ */}
            {outgoingRequests.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '24px' }}
                >
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#FF9500' }}>
                        <Clock size={20} />
                        Pending Outgoing Requests ({outgoingRequests.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {outgoingRequests.map((req, i) => (
                            <motion.div
                                key={req.linkId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="card"
                                style={{
                                    padding: '16px',
                                    border: '2px solid #FF950020',
                                    background: 'linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%)',
                                    opacity: 0.85
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 'bold', fontSize: '18px'
                                    }}>
                                        {req.recipient?.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                            {req.recipient?.name || 'Unknown'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                            <span>{req.relation}</span>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '12px',
                                        background: '#FFF3E0', color: '#E65100',
                                        fontSize: '12px', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <Clock size={12} /> Awaiting response
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ═══════════ CONNECTED MEMBERS LIST ═══════════ */}
            <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#333' }}>
                    <Users size={20} />
                    Connected Members ({members.length})
                </h3>
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
                        members.map((member, index) => {
                            const myPerms = member.myGrantedPermissions || { access_level: 'full' };
                            const badge = getPermissionBadge(myPerms.access_level);
                            return (
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
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', color: '#8E8E93', fontSize: '13px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {member.phone && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={12} /> {member.phone}
                                                </span>
                                            )}
                                            {member.email && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Mail size={12} /> {member.email}
                                                </span>
                                            )}
                                            {member.dob && <span>Age: {new Date().getFullYear() - new Date(member.dob).getFullYear()}</span>}
                                            {/* My sharing permission badge */}
                                            <span style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                background: badge.bg, color: badge.color,
                                                padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600
                                            }}>
                                                {badge.icon} {badge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Manage Permissions button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleManagePermissions(member);
                                        }}
                                        title="Manage sharing permissions"
                                        style={{
                                            padding: '8px 12px', background: '#F2F2F7',
                                            color: '#007AFF', border: '1px solid #E5E5EA', cursor: 'pointer',
                                            borderRadius: '8px', marginRight: '8px', fontSize: '12px',
                                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => { e.target.style.background = '#E5E5EA'; }}
                                        onMouseLeave={e => { e.target.style.background = '#F2F2F7'; }}
                                    >
                                        <Settings size={14} /> Permissions
                                    </button>

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
                            );
                        })
                    )}
                </div>
            </div>

            {/* ═══════════ ADD MEMBER MODAL ═══════════ */}
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
                            style={{ width: '100%', maxWidth: '420px', padding: '24px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>Add Family Member</h3>
                                <button onClick={closeAddModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="#8E8E93" />
                                </button>
                            </div>

                            <div style={{
                                padding: '12px', borderRadius: '8px', background: '#E8F5E9',
                                marginBottom: '16px', fontSize: '13px', color: '#2E7D32'
                            }}>
                                💡 A connection request will be sent. The member must accept before records are shared.
                            </div>

                            <form onSubmit={handleInitiate}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                        PHONE NUMBER OR EMAIL
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter registered phone number or email"
                                        value={newMemberIdentifier}
                                        onChange={(e) => setNewMemberIdentifier(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA', boxSizing: 'border-box' }}
                                    />
                                    <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px' }}>
                                        The family member must already have an account on HealthNexus.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8E8E93', marginBottom: '6px' }}>
                                        RELATIONSHIP
                                    </label>
                                    <select
                                        value={relation}
                                        onChange={(e) => setRelation(e.target.value)}
                                        style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #E5E5EA', boxSizing: 'border-box' }}
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

                                {error && (
                                    <div style={{ color: '#FF3B30', fontSize: '13px', marginBottom: '16px', background: '#FFF0F0', padding: '10px', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                    style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                >
                                    {loading ? 'Sending...' : (<><UserPlus size={18} /> Send Connection Request</>)}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════ PERMISSION MODAL ═══════════ */}
            <AnimatePresence>
                {showPermissionModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1100, padding: '20px'
                    }} onClick={(e) => { if (e.target === e.currentTarget) closePermissionModal(); }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '500px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Shield size={22} color="#007AFF" />
                                    {permissionMode === 'accept' ? 'Accept & Set Sharing' : 'Manage Sharing Permissions'}
                                </h3>
                                <button onClick={closePermissionModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="#8E8E93" />
                                </button>
                            </div>

                            {permissionMode === 'accept' && selectedRequest && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '10px', background: '#F0F7FF',
                                    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #007AFF, #5856D6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 'bold'
                                    }}>
                                        {selectedRequest.requester?.name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{selectedRequest.requester?.name}</div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93' }}>
                                            {selectedRequest.relation} • Requested to connect
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p style={{ fontSize: '14px', color: '#636366', marginBottom: '16px' }}>
                                Choose what health records <strong>{permissionMode === 'accept' ? selectedRequest?.requester?.name : selectedMemberForPerms?.name}</strong> can see:
                            </p>

                            {/* Access Level Options */}
                            <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                                {/* Full Access */}
                                <label
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                        border: `2px solid ${permissionAccessLevel === 'full' ? '#34C759' : '#E5E5EA'}`,
                                        background: permissionAccessLevel === 'full' ? '#F0FFF4' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="accessLevel"
                                        value="full"
                                        checked={permissionAccessLevel === 'full'}
                                        onChange={() => setPermissionAccessLevel('full')}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '50%',
                                        border: `2px solid ${permissionAccessLevel === 'full' ? '#34C759' : '#C7C7CC'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: permissionAccessLevel === 'full' ? '#34C759' : 'white',
                                        transition: 'all 0.2s', flexShrink: 0
                                    }}>
                                        {permissionAccessLevel === 'full' && <Check size={14} color="white" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <ShieldCheck size={16} color="#34C759" /> Full Access
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>
                                            They can view all your health records and documents
                                        </div>
                                    </div>
                                </label>

                                {/* Selected Files */}
                                <label
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                        border: `2px solid ${permissionAccessLevel === 'selected' ? '#FF9500' : '#E5E5EA'}`,
                                        background: permissionAccessLevel === 'selected' ? '#FFF8F0' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="accessLevel"
                                        value="selected"
                                        checked={permissionAccessLevel === 'selected'}
                                        onChange={() => setPermissionAccessLevel('selected')}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '50%',
                                        border: `2px solid ${permissionAccessLevel === 'selected' ? '#FF9500' : '#C7C7CC'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: permissionAccessLevel === 'selected' ? '#FF9500' : 'white',
                                        transition: 'all 0.2s', flexShrink: 0
                                    }}>
                                        {permissionAccessLevel === 'selected' && <Check size={14} color="white" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Shield size={16} color="#FF9500" /> Selected Files Only
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>
                                            Choose exactly which documents they can access
                                        </div>
                                    </div>
                                </label>

                                {/* No Access */}
                                <label
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                        border: `2px solid ${permissionAccessLevel === 'none' ? '#FF3B30' : '#E5E5EA'}`,
                                        background: permissionAccessLevel === 'none' ? '#FFF0F0' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="accessLevel"
                                        value="none"
                                        checked={permissionAccessLevel === 'none'}
                                        onChange={() => setPermissionAccessLevel('none')}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '50%',
                                        border: `2px solid ${permissionAccessLevel === 'none' ? '#FF3B30' : '#C7C7CC'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: permissionAccessLevel === 'none' ? '#FF3B30' : 'white',
                                        transition: 'all 0.2s', flexShrink: 0
                                    }}>
                                        {permissionAccessLevel === 'none' && <Check size={14} color="white" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <ShieldOff size={16} color="#FF3B30" /> No Access
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>
                                            Connect profiles only — no health records shared
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Document Selection (only when "selected" is chosen) */}
                            <AnimatePresence>
                                {permissionAccessLevel === 'selected' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', marginBottom: '20px' }}
                                    >
                                        <div style={{
                                            border: '1px solid #E5E5EA', borderRadius: '12px',
                                            padding: '16px', background: '#FAFAFA'
                                        }}>
                                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FileText size={16} color="#007AFF" />
                                                Select documents to share
                                                {selectedDocIds.length > 0 && (
                                                    <span style={{
                                                        background: '#007AFF', color: 'white',
                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px'
                                                    }}>
                                                        {selectedDocIds.length} selected
                                                    </span>
                                                )}
                                            </h4>

                                            {loadingDocs ? (
                                                <div style={{ padding: '20px', textAlign: 'center', color: '#8E8E93' }}>
                                                    Loading your documents...
                                                </div>
                                            ) : myDocuments.length === 0 ? (
                                                <div style={{ padding: '20px', textAlign: 'center', color: '#8E8E93', fontSize: '13px' }}>
                                                    You don't have any documents yet. You can update permissions later after uploading.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                                                    {myDocuments.map(doc => {
                                                        const isSelected = selectedDocIds.includes(doc.id);
                                                        return (
                                                            <label
                                                                key={doc.id}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                                                    background: isSelected ? '#E8F0FE' : 'white',
                                                                    border: `1px solid ${isSelected ? '#007AFF' : '#E5E5EA'}`,
                                                                    transition: 'all 0.15s'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: '20px', height: '20px', borderRadius: '4px',
                                                                    border: `2px solid ${isSelected ? '#007AFF' : '#C7C7CC'}`,
                                                                    background: isSelected ? '#007AFF' : 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    transition: 'all 0.15s', flexShrink: 0
                                                                }}>
                                                                    {isSelected && <Check size={12} color="white" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleDocSelection(doc.id)}
                                                                    style={{ display: 'none' }}
                                                                />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{
                                                                        fontWeight: 500, fontSize: '13px',
                                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                                    }}>
                                                                        {doc.file_name || doc.title || 'Untitled Document'}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: '2px' }}>
                                                                        {doc.type || 'Document'} {doc.createdAt ? `• ${new Date(doc.createdAt._seconds ? doc.createdAt._seconds * 1000 : doc.createdAt).toLocaleDateString()}` : ''}
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={closePermissionModal}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '10px',
                                        border: '1px solid #E5E5EA', background: 'white',
                                        color: '#636366', fontWeight: 600, cursor: 'pointer', fontSize: '15px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePermissionSubmit}
                                    disabled={loading || (permissionAccessLevel === 'selected' && selectedDocIds.length === 0 && myDocuments.length > 0)}
                                    className="btn-primary"
                                    style={{
                                        flex: 2, padding: '14px', fontSize: '15px',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
                                        opacity: (loading || (permissionAccessLevel === 'selected' && selectedDocIds.length === 0 && myDocuments.length > 0)) ? 0.6 : 1
                                    }}
                                >
                                    {loading ? 'Saving...' : (
                                        permissionMode === 'accept'
                                            ? <><ShieldCheck size={16} /> Accept Connection</>
                                            : <><Settings size={16} /> Save Permissions</>
                                    )}
                                </button>
                            </div>

                            {permissionAccessLevel === 'selected' && selectedDocIds.length === 0 && myDocuments.length > 0 && (
                                <p style={{ fontSize: '12px', color: '#FF9500', marginTop: '8px', textAlign: 'center' }}>
                                    Please select at least one document, or choose "No Access" if you don't want to share any records.
                                </p>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FamilyHealth;
