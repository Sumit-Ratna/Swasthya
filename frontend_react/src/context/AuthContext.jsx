import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export const AuthContext = createContext();

// ---------------------------------------------------------------------------
// Axios instance — all backend requests go through here so the interceptor
// and default headers apply uniformly.
// ---------------------------------------------------------------------------
export const api = axios.create({ baseURL: API_URL });

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isRefreshing = useRef(false);

    // ── Bootstrap: restore session on page load ──────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }

        // ── Axios interceptor: silent token refresh on 401 ──────────────────
        const interceptor = api.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Only attempt refresh once per request; skip auth endpoints themselves
                if (
                    error.response?.status === 401 &&
                    !originalRequest._retried &&
                    !originalRequest.url?.includes('/auth/refresh') &&
                    !originalRequest.url?.includes('/auth/login')
                ) {
                    originalRequest._retried = true;

                    if (isRefreshing.current) {
                        // Another refresh already in flight — just reject
                        return Promise.reject(error);
                    }

                    isRefreshing.current = true;

                    try {
                        const refreshToken = localStorage.getItem('refreshToken');
                        if (!refreshToken) throw new Error('No refresh token');

                        const res = await api.post('/api/auth/refresh', { refreshToken });
                        const { accessToken, refreshToken: newRefreshToken } = res.data;

                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);
                        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

                        isRefreshing.current = false;
                        return api(originalRequest); // retry original request
                    } catch (refreshErr) {
                        isRefreshing.current = false;
                        console.warn('[AUTH] Refresh failed — logging out');
                        logout();
                        return Promise.reject(refreshErr);
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => api.interceptors.response.eject(interceptor);
    }, []);

    // ── Fetch current user from /api/auth/me ─────────────────────────────────
    const fetchUser = async () => {
        try {
            const res = await api.get('/api/auth/me');
            setUser(res.data);
        } catch (err) {
            console.error('[AUTH] fetchUser failed:', err.message);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            delete api.defaults.headers.common['Authorization'];
        } finally {
            setLoading(false);
        }
    };

    // ── register ──────────────────────────────────────────────────────────────
    /**
     * @param {Object} data - { role, name, phone?, email?, password, confirmPassword,
     *                          dob?, gender?, blood_group?, specialization?, hospital_name? }
     */
    const register = async (data) => {
        const res = await api.post('/api/auth/register', data);
        const { accessToken, refreshToken, user: userData } = res.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        setUser(userData);

        return userData;
    };

    // ── login ─────────────────────────────────────────────────────────────────
    /**
     * @param {string} identifier - phone number or email address
     * @param {string} password
     */
    const login = async (identifier, password) => {
        const res = await api.post('/api/auth/login', { identifier, password });
        const { accessToken, refreshToken, user: userData } = res.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        setUser(userData);

        return userData;
    };

    // ── logout ────────────────────────────────────────────────────────────────
    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        window.location.href = '/';
    };

    // ── deleteAccount ─────────────────────────────────────────────────────────
    const deleteAccount = async () => {
        await api.delete('/api/profile/delete');
        logout();
    };

    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout, deleteAccount, fetchUser, api }}>
            {children}
        </AuthContext.Provider>
    );
};
