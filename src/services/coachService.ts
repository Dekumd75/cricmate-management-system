import api from './api';

const coachService = {
    // Create new player (coach access)
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
        const response = await api.post('/coach/players', playerData);
        return response.data;
    },

    // Get pending parents
    getPendingParents: async () => {
        const response = await api.get('/coach/pending-parents');
        return response.data;
    },

    // Approve a pending parent
    approveParent: async (parentId: number) => {
        const response = await api.post(`/coach/approve-parent/${parentId}`);
        return response.data;
    },

    // Reject a pending parent
    rejectParent: async (parentId: number) => {
        const response = await api.post(`/coach/reject-parent/${parentId}`);
        return response.data;
    },

    // Get total player count
    getPlayerCount: async (): Promise<number> => {
        const response = await api.get('/coach/players');
        return (response.data.players || []).length;
    },

    // Get today's attendance summary (present / total)
    getTodayAttendance: async (): Promise<{ present: number; total: number }> => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const response = await api.get(`/attendance/date/${today}`);
        const records: any[] = response.data.records || [];
        const present = records.filter((r: any) => r.status === 'present' || r.status === 'early-leave').length;
        return { present, total: records.length };
    }
};

export default coachService;
