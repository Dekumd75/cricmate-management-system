import api from './api';

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone: string;
    role?: string;
}

export interface AuthResponse {
    message: string;
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        phone?: string;
    };
}

class AuthService {
    /**
     * Login user
     */
    async login(data: LoginData): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/login', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    }

    /**
     * Register new parent user
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/register', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    }

    /**
     * Get current user info
     */
    async getCurrentUser() {
        const response = await api.get('/auth/me');
        return response.data.user;
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    }

    /**
     * Get stored user
     */
    getStoredUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Change password
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const response = await api.put('/auth/change-password', {
            currentPassword,
            newPassword
        });
        return response.data;
    }
    /**
     * Request password reset
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    }

    /**
     * Reset password with token
     */
    async resetPassword(email: string, resetToken: string, newPassword: string): Promise<{ message: string }> {
        const response = await api.post('/auth/reset-password', {
            email,
            resetToken,
            newPassword
        });
        return response.data;
    }


    /**
     * Get stored token
     */
    getToken(): string | null {
        return localStorage.getItem('token');
    }
}

export default new AuthService();
