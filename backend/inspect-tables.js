require('dotenv').config();
const sequelize = require('./config/database');

async function inspectTables() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database\n');

        const tables = ['matches', 'matchstats', 'opponent', 'attendance_record'];

        for (const tableName of tables) {
            console.log(`\n========== ${tableName.toUpperCase()} TABLE ==========`);

            // Get table structure
            const [results] = await sequelize.query(`DESCRIBE ${tableName}`);

            console.log('Columns:');
            results.forEach(col => {
                console.log(`  ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Extra || ''}`);
            });

            // Get sample count
            const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`\nRecord count: ${count}`);

            // Show sample row if exists
            if (count > 0) {
                const [sample] = await sequelize.query(`SELECT * FROM ${tableName} LIMIT 1`);
                console.log('\nSample row:');
                console.log(JSON.stringify(sample[0], null, 2));
            }
        }

        await sequelize.close();
        console.log('\n✅ Database inspection complete');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

inspectTables();
