require('dotenv').config();
const sequelize = require('./config/database');

async function addMatchColumns() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database\n');

        console.log('Adding missing columns to matches table...');

        // Add status column
        await sequelize.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
        `);
        console.log('✅ Added status column');

        // Add squadIds column (JSON)
        await sequelize.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS squadIds JSON DEFAULT NULL
        `);
        console.log('✅ Added squadIds column');

        // Add createdBy column
        await sequelize.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS createdBy INT,
            ADD FOREIGN KEY IF NOT EXISTS (createdBy) REFERENCES user(userID)
        `);
        console.log('✅ Added createdBy column');

        // Add attendanceDate column to attendance_record
        await sequelize.query(`
            ALTER TABLE attendance_record 
            ADD COLUMN IF NOT EXISTS attendanceDate DATE DEFAULT NULL
        `);
        console.log('✅ Added attendanceDate column to attendance_record');

        await sequelize.close();
        console.log('\n✅ Database schema updates complete');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addMatchColumns();
