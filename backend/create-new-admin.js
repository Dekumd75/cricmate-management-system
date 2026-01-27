// Create new admin user with strong password
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');

async function createNewAdmin() {
    try {
        console.log('Creating new admin user...\n');

        // Strong password that meets Level 2 requirements
        const email = 'admin@cricmate.com';
        const password = 'Admin@2024';
        const name = 'System Admin';

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if admin exists
        const [existing] = await sequelize.query(`
            SELECT userID FROM user WHERE email = ?
        `, { replacements: [email] });

        if (existing.length > 0) {
            // Update existing admin
            console.log('Updating existing admin...');
            await sequelize.query(`
                UPDATE user 
                SET passwordHash = ?,
                    name = ?,
                    accountStatus = 'active',
                    failedLoginAttempts = 0,
                    lockoutUntil = NULL
                WHERE email = ?
            `, { replacements: [hashedPassword, name, email] });
            console.log('✅ Admin updated successfully!\n');
        } else {
            // Create new admin
            console.log('Creating new admin...');
            await sequelize.query(`
                INSERT INTO user (name, email, passwordHash, role, contactNumber, accountStatus, failedLoginAttempts)
                VALUES (?, ?, ?, 'admin', '0771234567', 'active', 0)
            `, { replacements: [name, email, hashedPassword] });
            console.log('✅ Admin created successfully!\n');
        }

        // Verify password works
        const testMatch = await bcrypt.compare(password, hashedPassword);
        console.log('✓ Password verification:', testMatch ? 'PASS' : 'FAIL');

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  ADMIN CREDENTIALS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email:    admin@cricmate.com');
        console.log('Password: Admin@2024');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createNewAdmin();
