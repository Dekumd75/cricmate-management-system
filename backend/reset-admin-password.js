// Force update admin password to admin123
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');

async function resetAdminPassword() {
    try {
        console.log('Resetting admin password to "admin123"...');

        // Hash the password properly
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        console.log('New hash generated:', hashedPassword);

        // Update directly in database
        await sequelize.query(`
            UPDATE user 
            SET passwordHash = ?
            WHERE email = 'admin@cricmate.com'
        `, {
            replacements: [hashedPassword]
        });

        console.log(' Password updated successfully!');

        // Test it
        const bcrypt2 = require('bcryptjs');
        const isMatch = await bcrypt2.compare('admin123', hashedPassword);
        console.log('✓ Testing: Password matches admin123:', isMatch);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetAdminPassword();
