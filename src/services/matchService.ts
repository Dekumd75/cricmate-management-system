import api from './api';

const matchService = {
    /**
     * Create new match
     */
    createMatch: async (matchData: {
        opponent: string;
        date: string;
        venue: string;
        matchType: string;
        result?: string;
    }) => {
        const response = await api.post('/match/create', matchData);
        return response.data;
    },

    /**
     * Confirm squad for match
     */
    confirmSquad: async (matchId: number, squadIds: number[]) => {
        const response = await api.post(`/match/${matchId}/confirm-squad`, { squadIds });
        return response.data;
    },

    /**
     * Update match statistics
     */
    updateMatchStats: async (matchId: number, playerStats: any[], result?: string) => {
        const response = await api.post(`/match/${matchId}/update-stats`, {
            playerStats,
            result
        });
        return response.data;
    },

    /**
     * Get all matches
     */
    getAllMatches: async () => {
        const response = await api.get('/match/all');
        return response.data.matches;
    },

    /**
     * Get match by ID
     */
    getMatchById: async (matchId: number) => {
        const response = await api.get(`/match/${matchId}`);
        return response.data.match;
    },

    /**
     * Mark match as completed
     */
    completeMatch: async (matchId: number) => {
        const response = await api.post(`/match/${matchId}/complete`);
        return response.data;
    },

    /**
     * Get match statistics
     */
    getMatchStats: async (matchId: number) => {
        const response = await api.get(`/match/${matchId}/stats`);
        return response.data.stats;
    }
};

export default matchService;
