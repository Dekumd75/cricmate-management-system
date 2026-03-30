import api from './api';

const attendanceService = {
    /**
     * Mark attendance for players
     */
    markAttendance: async (date: string, sessionID: number, attendanceRecords: Array<{
        playerId: number;
        status: string;
    }>) => {
        const response = await api.post('/attendance/mark', {
            date,
            sessionID,
            attendanceRecords
        });
        return response.data;
    },

    /**
     * Get attendance for specific date
     */
    getAttendanceByDate: async (date: string) => {
        const response = await api.get(`/attendance/date/${date}`);
        return response.data.records;
    },

    /**
     * Get player attendance history
     */
    getPlayerAttendance: async (playerId: number, startDate?: string, endDate?: string) => {
        const params: any = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get(`/attendance/player/${playerId}`, { params });
        return response.data.records;
    },

    /**
     * Get attendance summary
     */
    getAttendanceSummary: async (startDate?: string, endDate?: string) => {
        const params: any = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get('/attendance/summary', { params });
        return response.data.summary;
    }
};

export default attendanceService;
