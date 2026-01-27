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
    }
};

export default coachService;
