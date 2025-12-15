import axios from 'axios';
import { API_URL as BASE_API_URL, BACKEND_URL } from '../config/api';

const API_URL = `${BASE_API_URL}/auth`;

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout

// Add request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axios.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (!error.response) {
      console.error('Network error - backend may not be running');
      error.message = 'Network error: Cannot connect to backend. Make sure backend is running on http://localhost:8000';
    }
    return Promise.reject(error);
  }
);

// Helper to check if we're in the browser
const isBrowser = typeof window !== 'undefined';

// Store token in localStorage
export const setAuthToken = (token) => {
  if (!isBrowser) return;
  
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Get token from localStorage
export const getAuthToken = () => {
  if (!isBrowser) return null;
  return localStorage.getItem('token');
};

// Initialize axios with token if available (only in browser)
if (isBrowser) {
  const token = getAuthToken();
  if (token) {
    setAuthToken(token);
  }
}

export const authService = {
  getAuthToken: () => {
    return getAuthToken();
  },

  signup: async (email, name, password) => {
    try {
      // Test backend connection first
      try {
        await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      } catch (connError) {
        throw new Error(`Cannot connect to backend server. Make sure it is running on ${BACKEND_URL}`);
      }

      const response = await axios.post(`${API_URL}/signup`, {
        email,
        name,
        password
      }, {
        timeout: 10000
      });
      if (response.data.access_token) {
        setAuthToken(response.data.access_token);
        if (isBrowser) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        throw new Error(`Cannot connect to backend. Please make sure the backend server is running on ${BACKEND_URL}`);
      }
      throw error;
    }
  },

  login: async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password
    });
    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  adminLogin: async (email, password) => {
    try {
      // Test backend connection first
      try {
        await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      } catch (connError) {
        throw new Error(`Cannot connect to backend server. Make sure it is running on ${BACKEND_URL}`);
      }

      const response = await axios.post(`${API_URL}/admin-login`, {
        email,
        password
      }, {
        timeout: 10000
      });
      if (response.data.access_token) {
        setAuthToken(response.data.access_token);
        if (isBrowser) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error) {
      console.error('Admin login error:', error);
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        throw new Error(`Cannot connect to backend. Please make sure the backend server is running on ${BACKEND_URL}`);
      }
      throw error;
    }
  },

  logout: () => {
    setAuthToken(null);
    if (isBrowser) {
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: () => {
    if (!isBrowser) return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    if (!isBrowser) return false;
    return !!getAuthToken();
  },

  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user && user.role === 'admin';
  }
};

