import api from './api';

const adminService = {
    // Create new coach
    createCoach: async (coachData: { name: string; email: string; phone: string; password: string }) => {
        const response = await api.post('/admin/coaches', coachData);
        return response.data;
    },

    // Create new player
    createPlayer: async (playerData: {
        name: string;
        email: string;
        phone: string;
        password: string;
        age: number;
        battingStyle: string;
        bowlingStyle: string;
        playerRole: string;
        generateInviteCode: boolean;
    }) => {
        const response = await api.post('/admin/players', playerData);
        return response.data;
    },

    // Get users by role
    getUsers: async (role?: string) => {
        const params = role ? { role } : {};
        const response = await api.get('/admin/users', { params });
        return response.data;
    }
};

export default adminService;
