import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only auto-logout for 401 errors from protected routes
        // Don't logout for login errors or password change errors
        if (error.response?.status === 401) {
            const isLoginError = error.config?.url?.includes('/auth/login');
            const isRegisterError = error.config?.url?.includes('/auth/register');
            const isPasswordChangeError = error.config?.url?.includes('/auth/change-password');

            // Only logout and redirect if it's NOT a login, register, or password change error
            if (!isLoginError && !isRegisterError && !isPasswordChangeError) {
                // Token expired or invalid - logout
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
