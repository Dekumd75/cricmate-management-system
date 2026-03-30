import api from './api';

const sessionService = {
    // Start a new training session
    startSession: async (groupID: number, title?: string, customGroupName?: string, customLocation?: string) => {
        const response = await api.post('/session/start', {
            groupID,
            title,
            customGroupName,
            customLocation
        });
        return response.data;
    },

    // End a session
    endSession: async (sessionId: number) => {
        const response = await api.post(`/session/${sessionId}/end`);
        return response.data;
    },

    // Get active sessions
    getActiveSessions: async () => {
        const response = await api.get('/session/active');
        return response.data.sessions;
    },

    // Get all sessions with optional filters
    getAllSessions: async (filters?: { status?: string; date?: string; groupID?: number }) => {
        const response = await api.get('/session/all', { params: filters });
        return response.data.sessions;
    },

    // Get session attendance
    getSessionAttendance: async (sessionId: number) => {
        const response = await api.get(`/session/${sessionId}/attendance`);
        return response.data;
    },

    // Get all player groups
    getGroups: async () => {
        const response = await api.get('/session/groups');
        return response.data.groups;
    }
};

export default sessionService;
