/**
 * config.js — Single source of truth for the backend API URL.
 *
 * Set VITE_API_URL in your .env file to point to the deployed backend.
 * Falls back to localhost for local development.
 */
const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
);

export const API_URL = isLocal
    ? 'http://localhost:8000'
    : (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
        ? import.meta.env.VITE_API_URL
        : 'https://swasthya-h7bt.onrender.com');
