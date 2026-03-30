require('dotenv').config();
const mysql = require('mysql2/promise');

async function testAttendanceFlow() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('=== Testing Attendance Flow ===\n');

        // 1. Check if there are any active sessions
        console.log('1. Checking for active sessions:');
        const [sessions] = await connection.query(`
            SELECT s.*, pg.groupName, pg.location 
            FROM session s
            JOIN playergroup pg ON s.groupID = pg.groupID
            WHERE s.status = 'active'
            ORDER BY s.sessionDate DESC, s.startTime DESC
            LIMIT 5
        `);
        console.table(sessions);

        if (sessions.length === 0) {
            console.log('\n⚠️  No active sessions found. Please start a session in the UI first.');
            return;
        }

        const sessionID = sessions[0].sessionID;
        console.log(`\n2. Using session ID: ${sessionID}`);

        // 2. Check attendance records for this session
        console.log('\n3. Checking attendance records for this session:');
        const [attendance] = await connection.query(`
            SELECT 
                ar.*,
                u.name as playerName
            FROM attendance_record ar
            LEFT JOIN user u ON ar.playerUserID = u.id
            WHERE ar.sessionID = ?
        `, [sessionID]);

        if (attendance.length > 0) {
            console.table(attendance);
        } else {
            console.log('No attendance records found for this session yet.');
        }

        // 3. Show recent attendance records (all sessions)
        console.log('\n4. Showing ALL recent attendance records:');
        const [allAttendance] = await connection.query(`
            SELECT 
                ar.recordID,
                ar.playerUserID,
                ar.attendanceDate,
                ar.status,
                ar.checkInTime,
                ar.checkOutTime,
                ar.sessionID,
                u.name as playerName,
                s.title as sessionTitle
            FROM attendance_record ar
            LEFT JOIN user u ON ar.playerUserID = u.id
            LEFT JOIN session s ON ar.sessionID = s.sessionID
            ORDER BY ar.attendanceDate DESC, ar.recordID DESC
            LIMIT 10
        `);
        console.table(allAttendance);

        console.log('\n✅ Test complete!');
        console.log('\nWhat to look for:');
        console.log('- checkInTime should match session startTime');
        console.log('- checkOutTime should be current time for early-leave');
        console.log('- sessionID should be populated');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testAttendanceFlow();
