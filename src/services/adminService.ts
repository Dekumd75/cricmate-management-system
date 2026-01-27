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
        dob: string;
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
    },

    // Get audit logs
    getAuditLogs: async () => {
        const response = await api.get('/admin/audit-logs');
        return response.data;
    },

    // Get pending parents
    getPendingParents: async () => {
        try {
            console.log('Fetching pending parents from:', '/admin/pending-parents');
            const response = await api.get('/admin/pending-parents');
            console.log('Pending parents response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('getPendingParents error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            throw error;
        }
    },

    // Approve a pending parent
    approveParent: async (parentId: number) => {
        const response = await api.post(`/admin/approve-parent/${parentId}`);
        return response.data;
    },

    // Reject a pending parent
    rejectParent: async (parentId: number) => {
        const response = await api.post(`/admin/reject-parent/${parentId}`);
        return response.data;
    }
};

export default adminService;
