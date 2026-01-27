// Script to add new security columns to existing user table
const sequelize = require('./config/database');

async function addSecurityColumns() {
    try {
        console.log('Adding security columns to user table...');

        // Add new columns if they don't exist
        await sequelize.query(`
            ALTER TABLE user 
            ADD COLUMN IF NOT EXISTS failedLoginAttempts INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS lockoutUntil DATETIME NULL,
            ADD COLUMN IF NOT EXISTS lastLoginAt DATETIME NULL,
            ADD COLUMN IF NOT EXISTS passwordChangedAt DATETIME NULL;
        `);

        console.log('✅ Security columns added successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error adding columns:', error.message);

        // Try adding one by one (MySQL doesn't support IF NOT EXISTS in all versions)
        try {
            console.log('Trying alternative method...');

            const queries = [
                'ALTER TABLE user ADD COLUMN failedLoginAttempts INT DEFAULT 0',
                'ALTER TABLE user ADD COLUMN lockoutUntil DATETIME NULL',
                'ALTER TABLE user ADD COLUMN lastLoginAt DATETIME NULL',
                'ALTER TABLE user ADD COLUMN passwordChangedAt DATETIME NULL'
            ];

            for (const query of queries) {
                try {
                    await sequelize.query(query);
                    console.log('✅ Added column');
                } catch (err) {
                    if (err.message.includes('Duplicate column')) {
                        console.log('⏭️  Column already exists, skipping');
                    } else {
                        throw err;
                    }
                }
            }

            console.log('✅ All security columns added!');
            process.exit(0);

        } catch (err2) {
            console.error('❌ Failed:', err2.message);
            process.exit(1);
        }
    }
}

addSecurityColumns();
