// Check raw password hash in database
const sequelize = require('./config/database');

async function checkPasswordHash() {
    try {
        const [results] = await sequelize.query(`
            SELECT userID, name, email, passwordHash 
            FROM user 
            WHERE email = 'admin@cricmate.com'
        `);

        if (results.length > 0) {
            const admin = results[0];
            console.log('Admin found:');
            console.log('ID:', admin.userID);
            console.log('Name:', admin.name);
            console.log('Email:', admin.email);
            console.log('Password Hash:', admin.passwordHash);
            console.log('Hash starts with $2a$ (bcrypt):', admin.passwordHash.startsWith('$2a$'));
            console.log('Hash length:', admin.passwordHash.length);
        } else {
            console.log('Admin not found!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPasswordHash();
