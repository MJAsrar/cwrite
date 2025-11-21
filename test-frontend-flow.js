// Simulate frontend authentication flow
const API_URL = 'http://localhost:8000';

// Simulate localStorage
let localStorage = {};

async function simulateFrontendFlow() {
    console.log('Simulating frontend authentication flow...');
    
    try {
        // Step 1: User logs in (simulate login page)
        console.log('\n1. Simulating login...');
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
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed');
            return;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        
        // Step 2: Store token in localStorage (like frontend does)
        localStorage['access_token'] = loginData.tokens.access_token;
        console.log('✅ Token stored in localStorage');
        
        // Step 3: Simulate page redirect to dashboard
        console.log('\n2. Simulating dashboard page load...');
        
        // Step 4: ProtectedRoute checks authentication
        console.log('3. ProtectedRoute checking authentication...');
        
        const token = localStorage['access_token'];
        if (!token) {
            console.log('❌ No token found, would redirect to login');
            return;
        }
        
        console.log('✅ Token found in localStorage');
        
        // Step 5: Verify token with backend (like ProtectedRoute does)
        console.log('4. Verifying token with backend...');
        
        const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        console.log('Me response status:', meResponse.status);
        
        if (!meResponse.ok) {
            console.log('❌ Token verification failed, would redirect to login');
            const errorData = await meResponse.json();
            console.log('Error:', errorData);
            return;
        }
        
        const userData = await meResponse.json();
        console.log('✅ Token verified successfully');
        console.log('User data:', userData);
        
        // Step 6: Dashboard loads user info (like DashboardLayout does)
        console.log('\n5. Dashboard loading user info...');
        
        const dashboardMeResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (dashboardMeResponse.ok) {
            const dashboardUserData = await dashboardMeResponse.json();
            console.log('✅ Dashboard loaded user info successfully');
            console.log('Dashboard user data:', dashboardUserData);
        } else {
            console.log('❌ Dashboard failed to load user info');
        }
        
        console.log('\n🎉 Full authentication flow completed successfully!');
        
    } catch (error) {
        console.error('❌ Flow failed:', error);
    }
}

simulateFrontendFlow();