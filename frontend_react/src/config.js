/**
 * config.js — Single source of truth for the backend API URL.
 *
 * Set VITE_API_URL in your .env file to point to the deployed backend.
 * Falls back to localhost for local development.
 */
export const API_URL = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000'
        : 'https://swasthya-h7bt.onrender.com'
);
