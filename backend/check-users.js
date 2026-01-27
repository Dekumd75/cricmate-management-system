// Check what users exist in database
const { User } = require('./models');

async function checkUsers() {
    try {
        console.log('Checking users in database...\n');

        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'accountStatus']
        });

        console.log(`Found ${users.length} users:\n`);
        users.forEach(user => {
            console.log(`ID: ${user.id}`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Status: ${user.accountStatus}`);
            console.log('---');
        });

        // Check specifically for admin
        const admin = await User.findOne({ where: { email: 'admin@cricmate.com' } });
        if (admin) {
            console.log('\n✅ Admin user found!');
            console.log('Testing password comparison...');
            const isMatch = await admin.comparePassword('admin123');
            console.log('Password matches admin123:', isMatch);
        } else {
            console.log('\n❌ Admin user NOT found!');
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
