// Test authentication flow
const API_URL = 'http://localhost:8000';

async function testAuthFlow() {
    console.log('Testing authentication flow...');
    
    try {
        // Test 1: Health check
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await fetch(`${API_URL}/api/v1/health`);
        const healthData = await healthResponse.json();
        console.log('Health check:', healthData);
        
        // Test 2: Try to access protected endpoint without token
        console.log('\n2. Testing protected endpoint without token...');
        try {
            const meResponse = await fetch(`${API_URL}/api/v1/auth/me`);
            console.log('Me endpoint status:', meResponse.status);
            if (!meResponse.ok) {
                const errorData = await meResponse.json();
                console.log('Expected error:', errorData);
            }
        } catch (error) {
            console.log('Expected error:', error.message);
        }
        
        // Test 3: Login with test credentials
        console.log('\n3. Testing login...');
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
            console.log('Login successful:', {
                user: loginData.user,
                hasTokens: !!loginData.tokens,
                tokenType: loginData.tokens?.token_type
            });
            
            // Test 4: Use the token to access protected endpoint
            console.log('\n4. Testing protected endpoint with token...');
            const token = loginData.tokens.access_token;
            const meWithTokenResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Me with token status:', meWithTokenResponse.status);
            if (meWithTokenResponse.ok) {
                const userData = await meWithTokenResponse.json();
                console.log('User data:', userData);
            } else {
                const errorData = await meWithTokenResponse.json();
                console.log('Token verification error:', errorData);
            }
        } else {
            const loginError = await loginResponse.json();
            console.log('Login failed:', loginError);
            
            // Maybe user doesn't exist, try to register
            console.log('\n3b. Trying to register test user...');
            const registerResponse = await fetch(`${API_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'testpassword123',
                    confirm_password: 'testpassword123'
                })
            });
            
            console.log('Register status:', registerResponse.status);
            if (registerResponse.ok) {
                const registerData = await registerResponse.json();
                console.log('Registration successful:', {
                    user: registerData.user,
                    hasTokens: !!registerData.tokens
                });
            } else {
                const registerError = await registerResponse.json();
                console.log('Registration failed:', registerError);
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testAuthFlow();