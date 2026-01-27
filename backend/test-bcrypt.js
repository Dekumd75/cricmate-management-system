// Test password comparison with bcrypt directly
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');

async function testPasswordDirectly() {
    try {
        // Get the password hash from database
        const [results] = await sequelize.query(`
            SELECT passwordHash 
            FROM user 
            WHERE email = 'admin@cricmate.com'
        `);

        if (results.length === 0) {
            console.log('❌ Admin not found in database!');
            process.exit(1);
        }

        const storedHash = results[0].passwordHash;
        console.log('Stored hash:', storedHash);
        console.log('');

        // Test different passwords
        const passwords = ['admin123', 'Admin123', 'admin', '123'];

        for (const pwd of passwords) {
            const isMatch = await bcrypt.compare(pwd, storedHash);
            console.log(`Password "${pwd}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testPasswordDirectly();
