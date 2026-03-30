require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔄 Starting schema updates...\n');

        // 1. Add location to playergroup table
        console.log('1. Adding location column to playergroup table...');
        try {
            await connection.query(`
                ALTER TABLE playergroup 
                ADD COLUMN location VARCHAR(50) DEFAULT NULL
            `);
            console.log('   ✅ Location column added');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⚠️  Location column already exists');
            } else {
                throw error;
            }
        }

        // 2. Add status to session table
        console.log('\n2. Adding status column to session table...');
        try {
            await connection.query(`
                ALTER TABLE session 
                ADD COLUMN status VARCHAR(20) DEFAULT 'active'
            `);
            console.log('   ✅ Status column added');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⚠️  Status column already exists');
            } else {
                throw error;
            }
        }

        // 3. Add sessionID to attendance_record table
        console.log('\n3. Adding sessionID column to attendance_record table...');
        try {
            await connection.query(`
                ALTER TABLE attendance_record 
                ADD COLUMN sessionID INT DEFAULT NULL
            `);
            console.log('   ✅ SessionID column added');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⚠️  SessionID column already exists');
            } else {
                throw error;
            }
        }

        // 4. Add foreign key constraint for sessionID
        console.log('\n4. Adding foreign key constraint...');
        try {
            await connection.query(`
                ALTER TABLE attendance_record 
                ADD CONSTRAINT fk_attendance_session
                FOREIGN KEY (sessionID) REFERENCES session(sessionID)
                ON DELETE SET NULL
            `);
            console.log('   ✅ Foreign key constraint added');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ⚠️  Foreign key constraint already exists');
            } else {
                throw error;
            }
        }

        // 5. Populate playergroup table with groups
        console.log('\n5. Populating playergroup table with default groups...');
        const groups = [
            { name: 'General', location: 'Tangalle' },
            { name: 'General', location: 'Weeraketiya' },
            { name: 'Under 13', location: 'Tangalle' },
            { name: 'Under 13', location: 'Weeraketiya' },
            { name: 'Under 15', location: 'Tangalle' },
            { name: 'Under 15', location: 'Weeraketiya' },
            { name: 'Under 17', location: 'Tangalle' },
            { name: 'Under 17', location: 'Weeraketiya' },
            { name: 'Under 19', location: 'Tangalle' },
            { name: 'Under 19', location: 'Weeraketiya' }
        ];

        for (const group of groups) {
            // Check if group already exists
            const [existing] = await connection.query(
                'SELECT * FROM playergroup WHERE groupName = ? AND location = ?',
                [group.name, group.location]
            );

            if (existing.length === 0) {
                await connection.query(
                    'INSERT INTO playergroup (groupName, location) VALUES (?, ?)',
                    [group.name, group.location]
                );
                console.log(`   ✅ Added: ${group.name} - ${group.location}`);
            } else {
                console.log(`   ⚠️  Exists: ${group.name} - ${group.location}`);
            }
        }

        console.log('\n✅ All schema updates completed successfully!');

        // Display final state
        console.log('\n📊 Final playergroup table:');
        const [groups_result] = await connection.query('SELECT * FROM playergroup');
        console.table(groups_result);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Code:', error.code);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateSchema();
