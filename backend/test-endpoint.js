// Quick diagnostic script to test the pending parents endpoint

const axios = require('axios');

// Test without authentication
async function testEndpoint() {
    try {
        console.log('Testing /api/admin/pending-parents endpoint...');
        const response = await axios.get('http://localhost:5000/api/admin/pending-parents');
        console.log('Success:', response.data);
    } catch (error) {
        console.log('Error:', error.response?.status, error.response?.data);
        console.log('\nThis is expected - the endpoint requires authentication');
        console.log('The frontend should be sending an auth token in the Authorization header');
    }
}

testEndpoint();
