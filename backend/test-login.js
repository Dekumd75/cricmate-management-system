// Quick test to verify admin login works with old password
const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing admin login with admin123...');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@cricmate.com',
            password: 'admin123'
        });

        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('Token:', response.data.token.substring(0, 20) + '...');
        console.log('User:', response.data.user);

    } catch (error) {
        console.log('❌ LOGIN FAILED!');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin();
