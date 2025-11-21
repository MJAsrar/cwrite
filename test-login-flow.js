// Test login flow with registered user
const API_URL = 'http://localhost:8000';

async function testLogin() {
    console.log('Testing login with registered user...');
    
    try {
        // Test login
        const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'testpassword123'
            })
        });
        
        console.log('Login status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Login successful!');
            console.log('User:', loginData.user);
            console.log('Access token length:', loginData.tokens.access_token.length);
            console.log('Token type:', loginData.tokens.token_type);
            
            // Test accessing protected endpoint
            const token = loginData.tokens.access_token;
            console.log('\nTesting /me endpoint with token...');
            
            const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Me endpoint status:', meResponse.status);
            
            if (meResponse.ok) {
                const userData = await meResponse.json();
                console.log('User data from /me:', userData);
                console.log('✅ Authentication flow working correctly!');
            } else {
                const errorData = await meResponse.json();
                console.log('❌ /me endpoint failed:', errorData);
            }
            
        } else {
            const loginError = await loginResponse.json();
            console.log('❌ Login failed:', loginError);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testLogin();