/**
 * API Configuration
 * 
 * In development: Uses Vite proxy (relative URLs work fine)
 * In production: Uses same-origin URLs (deployed together)
 * 
 * Environment variables (optional):
 * - VITE_API_BASE_URL: Override API base URL (for custom deployments)
 * - VITE_WS_URL: Override WebSocket URL (for custom deployments)
 */

// For standard deployments, these are just used as fallbacks
// The frontend uses relative URLs by default, which works in both dev (proxied) and prod
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const WS_BASE_PATH = import.meta.env.VITE_WS_BASE_PATH || '/ws';

export { API_BASE_URL, WS_BASE_PATH };
