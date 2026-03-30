import api from './api';

class UserService {
    /**
     * Get all coaches
     */
    async getCoaches(): Promise<any[]> {
        const response = await api.get('/admin/coaches');
        return response.data.coaches;
    }

    /**
     * Get all players (admin or coach access)
     */
    async getPlayers(userRole: string): Promise<any[]> {
        const endpoint = userRole === 'admin' ? '/admin/players' : '/coach/players';
        const response = await api.get(endpoint);
        return response.data.players;
    }

    /**
     * Get active users (parents with active status)
     */
    async getActiveUsers(): Promise<any[]> {
        const response = await api.get('/admin/users?role=parent');
        const parents = response.data.users.filter((user: any) => user.accountStatus === 'active');

        // Format for display
        return parents.map((parent: any) => ({
            id: parent.id,
            name: parent.name,
            email: parent.email,
            role: 'Parent'
        }));
    }

    /**
     * Get current logged-in player's profile
     */
    async getPlayerProfile(): Promise<any> {
        const response = await api.get('/player/profile');
        return response.data.player;
    }

    /**
     * Get player overall statistics
     */
    async getPlayerStats(playerId: number): Promise<any> {
        const response = await api.get(`/player/${playerId}/stats`);
        return response.data.stats;
    }

    /**
     * Update player profile
     */
    async updatePlayerProfile(profileData: {
        battingStyle?: string;
        bowlingStyle?: string;
        playerRole?: string;
        photoURL?: string;
    }): Promise<any> {
        const response = await api.put('/player/profile/update', profileData);
        return response.data;
    }
}

export default new UserService();
