// API Configuration
// This file centralizes the API URL configuration
// For production/EC2: Set NEXT_PUBLIC_API_URL in .env.local (e.g., http://13.233.199.47:8000/api)
// For development: Defaults to localhost:8000

// Get API URL from environment variable or use default
const getApiUrl = () => {
  // Auto-detect for client-side (runtime) - prioritize this over build-time env
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If accessing via IP or domain (not localhost), use same host for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Use port 8000 on same host
      return `${protocol}//${hostname}:8000/api`;
    }
  }
  
  // Fallback to environment variable (build-time)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Default to localhost for development
  return 'http://localhost:8000/api';
};

const getBackendUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace('/api', '');
};

// Export constants (will be evaluated at build time and runtime)
export const API_URL = getApiUrl();
export const BACKEND_URL = getBackendUrl();
export const API_BASE = API_URL;

// Export for use in other files
export default {
  API_URL,
  BACKEND_URL,
  API_BASE
};

