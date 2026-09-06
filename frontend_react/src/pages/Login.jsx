import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AtSign, Lock, Fingerprint, Phone } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!identifier || !password) {
            setError('Please enter your phone/email and password.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await login(identifier.trim(), password);
            navigate('/home');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'var(--bg-color)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
            >
                <div style={{
                    width: '64px', height: '64px',
                    background: 'var(--primary-color)',
                    borderRadius: '16px',
                    margin: '0 auto 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.4)'
                }}>
                    <Fingerprint color="white" size={32} />
                </div>

                <h1 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Welcome Back</h1>
                <p style={{ marginBottom: '32px' }}>Sign in to your HealthNexus account</p>

                <div className="card" style={{ padding: '40px 32px', textAlign: 'left', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
                    {error && (
                        <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '20px', background: '#fee2e2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            {error}
                        </div>
                    )}

                    {/* Phone or Email */}
                    <div style={{ marginBottom: '20px' }}>
                        <label>Phone or Email</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="login-identifier"
                                type="text"
                                placeholder="e.g. +1234567890 or you@example.com"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{ paddingLeft: '44px' }}
                                autoComplete="username"
                            />
                            {identifier.includes('@')
                                ? <AtSign size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                : <Phone size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            }
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '24px' }}>
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="login-password"
                                type="password"
                                placeholder="Your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{ paddingLeft: '44px' }}
                                autoComplete="current-password"
                            />
                            <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                    </div>

                    <button
                        id="login-submit"
                        className="btn-primary"
                        onClick={handleLogin}
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Don't have an account?{' '}
                        <span
                            onClick={() => navigate('/signup')}
                            style={{ color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Create account
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
