import api from './api';

const opponentService = {
    /**
     * Get all opponents
     */
    getAllOpponents: async () => {
        const response = await api.get('/opponent/all');
        return response.data.opponents;
    },

    /**
     * Create new opponent
     */
    createOpponent: async (name: string, contactInfo?: string) => {
        const response = await api.post('/opponent/create', {
            name,
            contactInfo
        });
        return response.data;
    }
};

export default opponentService;
