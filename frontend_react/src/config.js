/**
 * config.js — Single source of truth for the backend API URL.
 *
 * Set VITE_API_URL in your .env file to point to the deployed backend.
 * Falls back to localhost for local development.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
