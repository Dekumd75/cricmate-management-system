// Debug login issue - check what's happening
const axios = require('axios');

async function debugLogin() {
    try {
        console.log('Testing login with Admin@2024...\n');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@cricmate.com',
            password: 'Admin@2024'
        });

        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('❌ LOGIN FAILED!');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data);
        console.log('\nFull error details:', error.message);
    }
}

debugLogin();
