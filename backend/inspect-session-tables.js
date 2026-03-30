require('dotenv').config();
const mysql = require('mysql2/promise');

async function inspectTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('=== SESSION TABLE ===');
        const [sessionCols] = await connection.query('DESCRIBE session');
        console.table(sessionCols);

        console.log('\n=== PLAYERGROUP TABLE ===');
        const [groupCols] = await connection.query('DESCRIBE playergroup');
        console.table(groupCols);

        console.log('\n=== GROUP DATA ===');
        const [groups] = await connection.query('SELECT * FROM playergroup');
        console.table(groups);

        await connection.end();
        console.log('\n✅ Inspection complete');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspectTables();
