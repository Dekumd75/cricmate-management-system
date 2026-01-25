require('dotenv').config();
const sequelize = require('../config/database');
const { User } = require('../models');

const createAdmin = async () => {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✓ Connected to database');

        // Sync models (create tables if they don't exist)
        await sequelize.sync();
        console.log('✓ Database tables synced');

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: { email: 'admin@cricmate.com' }
        });

        if (existingAdmin) {
            console.log('⚠ Admin user already exists');
            console.log('Email:', existingAdmin.email);
            console.log('You can update the password manually if needed');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@cricmate.com',
            password: 'admin123', // This will be hashed automatically
            role: 'admin',
            phone: '0771234567'
        });

        console.log('\n✓ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email:    admin@cricmate.com');
        console.log('Password: admin123');
        console.log('Role:     admin');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠ IMPORTANT: Change the password after first login!\n');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
