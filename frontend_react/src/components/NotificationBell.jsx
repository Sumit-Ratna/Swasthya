import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    Bell,
    CheckCheck,
    Ticket,
    Pill,
    Calendar,
    Sparkles,
    Info,
    X,
    ExternalLink,
    RefreshCw
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';

const NotificationBell = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        // Optional 30s poll for live reminders
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        // Handle click outside to close dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const res = await axios.get(`${API_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNotifications(res.data?.notifications || []);
            setUnreadCount(res.data?.unreadCount || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const handleMarkAsRead = async (notifId, link) => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.put(
                `${API_URL}/api/notifications/${notifId}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotifications((prev) =>
                prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));

            if (link) {
                setIsOpen(false);
                navigate(link);
            }
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            await axios.put(
                `${API_URL}/api/notifications/read-all`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const handleSeedDemoReminders = async () => {
        setSeeding(true);
        try {
            const token = localStorage.getItem('accessToken');
            await axios.post(
                `${API_URL}/api/notifications/seed`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchNotifications();
        } catch (err) {
            console.error('Failed to seed reminders:', err);
        } finally {
            setSeeding(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'opd':
                return <Ticket size={18} color="#007AFF" />;
            case 'prescription':
                return <Pill size={18} color="#10B981" />;
            case 'appointment':
                return <Calendar size={18} color="#8B5CF6" />;
            default:
                return <Info size={18} color="#F59E0B" />;
        }
    };

    const getIconBg = (type) => {
        switch (type) {
            case 'opd':
                return '#E1F0FF';
            case 'prescription':
                return '#ECFDF5';
            case 'appointment':
                return '#F5F3FF';
            default:
                return '#FEF3C7';
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                }}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        minWidth: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 0 2px white'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: '50px',
                            right: 0,
                            width: '340px',
                            maxHeight: '480px',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                            border: '1px solid var(--border-color)',
                            zIndex: 2000,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                                    Reminders
                                </span>
                                {unreadCount > 0 && (
                                    <span style={{
                                        fontSize: '11px',
                                        backgroundColor: '#EF4444',
                                        color: 'white',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '10px'
                                    }}>
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllAsRead}
                                        title="Mark all as read"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <CheckCheck size={16} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '4px',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div style={{ overflowY: 'auto', maxHeight: '340px', flex: 1 }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                                    <p style={{ margin: 0, fontSize: '13px' }}>No reminders or alerts right now</p>
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleMarkAsRead(item.id, item.link)}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid var(--border-color)',
                                            backgroundColor: item.read ? 'white' : 'rgba(37, 99, 235, 0.04)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            transition: 'background-color 0.15s'
                                        }}
                                    >
                                        {/* Icon */}
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            backgroundColor: getIconBg(item.type),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '2px'
                                        }}>
                                            {getIcon(item.type)}
                                        </div>

                                        {/* Text */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: item.read ? 600 : 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    {item.title}
                                                </span>
                                                {!item.read && (
                                                    <span style={{
                                                        width: '7px',
                                                        height: '7px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'var(--primary-color)',
                                                        flexShrink: 0
                                                    }} />
                                                )}
                                            </div>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)',
                                                lineHeight: 1.4
                                            }}>
                                                {item.message}
                                            </p>
                                            {item.link && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    marginTop: '4px',
                                                    fontSize: '11px',
                                                    color: 'var(--primary-color)',
                                                    fontWeight: 600
                                                }}>
                                                    View details <ExternalLink size={10} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer: Demo Seed Trigger */}
                        <div style={{
                            padding: '10px 16px',
                            borderTop: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={handleSeedDemoReminders}
                                disabled={seeding}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-color)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: seeding ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 0'
                                }}
                            >
                                <Sparkles size={12} />
                                {seeding ? 'Seeding...' : 'Demo Reminders (OPD / Rx / Visit)'}
                            </button>
                            <button
                                type="button"
                                onClick={fetchNotifications}
                                title="Refresh"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
