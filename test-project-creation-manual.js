#!/usr/bin/env node

/**
 * Manual Project Creation Workflow Test
 * 
 * This script manually tests the project creation workflow by:
 * 1. Verifying project creation form validation works correctly
 * 2. Testing successful project creation and API integration
 * 3. Confirming new projects appear in projects list immediately
 * 
 * Run this with: node test-project-creation-manual.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testpassword123';

class ProjectCreationWorkflowTest {
  constructor() {
    this.authToken = null;
    this.createdProjects = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 0
      };
    }
  }

  async authenticateUser() {
    await this.log('Attempting to authenticate test user...');
    
    // Try to login first
    const loginResult = await this.makeRequest('POST', '/api/v1/auth/login', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (loginResult.success) {
      this.authToken = loginResult.data.access_token;
      await this.log('Successfully authenticated with existing user', 'success');
      return true;
    }

    // If login fails, try to register
    await this.log('Login failed, attempting to register new user...');
    const registerResult = await this.makeRequest('POST', '/api/v1/auth/register', {
      email: TEST_USER_EMAIL,
      username: 'testuser',
      password: TEST_USER_PASSWORD
    });

    if (registerResult.success) {
      // Try to login again after registration
      const secondLoginResult = await this.makeRequest('POST', '/api/v1/auth/login', {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });

      if (secondLoginResult.success) {
        this.authToken = secondLoginResult.data.access_token;
        await this.log('Successfully registered and authenticated new user', 'success');
        return true;
      }
    }

    await this.log('Failed to authenticate user', 'error');
    return false;
  }

  async testProjectCreationValidation() {
    await this.log('\n=== Test 1: Project Creation Validation ===');
    
    // Test 1.1: Empty project name should fail
    await this.log('Testing empty project name validation...');
    const emptyNameResult = await this.makeRequest('POST', '/api/v1/projects', {
      name: '',
      description: 'Test description'
    });

    if (!emptyNameResult.success && emptyNameResult.status === 400) {
      await this.log('✓ Correctly rejected empty project name', 'success');
    } else {
      await this.log('✗ Failed to reject empty project name', 'error');
      return false;
    }

    // Test 1.2: Very long project name should fail
    await this.log('Testing long project name validation...');
    const longName = 'A'.repeat(101); // Exceeds 100 character limit
    const longNameResult = await this.makeRequest('POST', '/api/v1/projects', {
      name: longName,
      description: 'Test description'
    });

    if (!longNameResult.success && longNameResult.status === 400) {
      await this.log('✓ Correctly rejected overly long project name', 'success');
    } else {
      await this.log('✗ Failed to reject overly long project name', 'error');
      return false;
    }

    // Test 1.3: Very long description should fail
    await this.log('Testing long description validation...');
    const longDescription = 'A'.repeat(501); // Exceeds 500 character limit
    const longDescResult = await this.makeRequest('POST', '/api/v1/projects', {
      name: 'Valid Name',
      description: longDescription
    });

    if (!longDescResult.success && longDescResult.status === 400) {
      await this.log('✓ Correctly rejected overly long description', 'success');
    } else {
      await this.log('✗ Failed to reject overly long description', 'error');
      return false;
    }

    await this.log('All validation tests passed!', 'success');
    return true;
  }

  async testSuccessfulProjectCreation() {
    await this.log('\n=== Test 2: Successful Project Creation ===');
    
    const projectData = {
      name: `Test Project ${Date.now()}`,
      description: 'A test project created by the workflow test'
    };

    await this.log(`Creating project: "${projectData.name}"...`);
    const createResult = await this.makeRequest('POST', '/api/v1/projects', projectData);

    if (!createResult.success) {
      await this.log(`Failed to create project: ${createResult.error}`, 'error');
      return false;
    }

    const createdProject = createResult.data;
    this.createdProjects.push(createdProject.id);

    await this.log(`✓ Successfully created project with ID: ${createdProject.id}`, 'success');
    await this.log(`✓ Project name: ${createdProject.name}`, 'success');
    await this.log(`✓ Project description: ${createdProject.description}`, 'success');
    await this.log(`✓ Created at: ${createdProject.created_at}`, 'success');

    // Verify the project data matches what we sent
    if (createdProject.name !== projectData.name) {
      await this.log('✗ Project name does not match', 'error');
      return false;
    }

    if (createdProject.description !== projectData.description) {
      await this.log('✗ Project description does not match', 'error');
      return false;
    }

    await this.log('Project creation test passed!', 'success');
    return { success: true, project: createdProject };
  }

  async testProjectAppearsInList() {
    await this.log('\n=== Test 3: Project Appears in List ===');
    
    // Get initial project count
    await this.log('Getting initial project list...');
    const initialListResult = await this.makeRequest('GET', '/api/v1/projects');
    
    if (!initialListResult.success) {
      await this.log(`Failed to get initial project list: ${initialListResult.error}`, 'error');
      return false;
    }

    const initialProjects = initialListResult.data;
    const initialCount = initialProjects.length;
    await this.log(`Initial project count: ${initialCount}`);

    // Create a new project
    const projectData = {
      name: `List Test Project ${Date.now()}`,
      description: 'Testing project list visibility'
    };

    await this.log(`Creating new project: "${projectData.name}"...`);
    const createResult = await this.makeRequest('POST', '/api/v1/projects', projectData);

    if (!createResult.success) {
      await this.log(`Failed to create project: ${createResult.error}`, 'error');
      return false;
    }

    const newProject = createResult.data;
    this.createdProjects.push(newProject.id);

    // Get updated project list
    await this.log('Getting updated project list...');
    const updatedListResult = await this.makeRequest('GET', '/api/v1/projects');
    
    if (!updatedListResult.success) {
      await this.log(`Failed to get updated project list: ${updatedListResult.error}`, 'error');
      return false;
    }

    const updatedProjects = updatedListResult.data;
    const updatedCount = updatedProjects.length;
    await this.log(`Updated project count: ${updatedCount}`);

    // Verify count increased by 1
    if (updatedCount !== initialCount + 1) {
      await this.log(`✗ Expected ${initialCount + 1} projects, got ${updatedCount}`, 'error');
      return false;
    }

    // Verify the new project is in the list
    const projectInList = updatedProjects.find(p => p.id === newProject.id);
    if (!projectInList) {
      await this.log('✗ New project not found in project list', 'error');
      return false;
    }

    await this.log(`✓ New project "${projectData.name}" appears in project list`, 'success');
    await this.log(`✓ Project count increased from ${initialCount} to ${updatedCount}`, 'success');
    await this.log('Project list visibility test passed!', 'success');
    return true;
  }

  async testDuplicateProjectNameHandling() {
    await this.log('\n=== Test 4: Duplicate Project Name Handling ===');
    
    const projectName = `Duplicate Test ${Date.now()}`;
    
    // Create first project
    await this.log(`Creating first project with name: "${projectName}"...`);
    const firstResult = await this.makeRequest('POST', '/api/v1/projects', {
      name: projectName,
      description: 'First project with this name'
    });

    if (!firstResult.success) {
      await this.log(`Failed to create first project: ${firstResult.error}`, 'error');
      return false;
    }

    this.createdProjects.push(firstResult.data.id);
    await this.log('✓ Successfully created first project', 'success');

    // Try to create second project with same name
    await this.log(`Attempting to create second project with same name: "${projectName}"...`);
    const secondResult = await this.makeRequest('POST', '/api/v1/projects', {
      name: projectName,
      description: 'Second project with same name'
    });

    if (!secondResult.success && secondResult.status === 409) {
      await this.log('✓ Correctly rejected duplicate project name', 'success');
      await this.log('Duplicate name handling test passed!', 'success');
      return true;
    } else {
      await this.log('✗ Failed to reject duplicate project name', 'error');
      return false;
    }
  }

  async cleanup() {
    await this.log('\n=== Cleanup ===');
    
    for (const projectId of this.createdProjects) {
      await this.log(`Deleting test project: ${projectId}...`);
      const deleteResult = await this.makeRequest('DELETE', `/api/v1/projects/${projectId}`);
      
      if (deleteResult.success) {
        await this.log(`✓ Successfully deleted project: ${projectId}`, 'success');
      } else {
        await this.log(`⚠ Failed to delete project ${projectId}: ${deleteResult.error}`, 'error');
      }
    }
    
    await this.log('Cleanup completed');
  }

  async runAllTests() {
    console.log('🚀 Starting Project Creation Workflow Tests');
    console.log('=' .repeat(50));
    
    try {
      // Authenticate
      const authSuccess = await this.authenticateUser();
      if (!authSuccess) {
        await this.log('Authentication failed - cannot proceed with tests', 'error');
        return false;
      }

      // Run all tests
      const tests = [
        () => this.testProjectCreationValidation(),
        () => this.testSuccessfulProjectCreation(),
        () => this.testProjectAppearsInList(),
        () => this.testDuplicateProjectNameHandling()
      ];

      let passed = 0;
      const total = tests.length;

      for (let i = 0; i < tests.length; i++) {
        try {
          const result = await tests[i]();
          if (result) {
            passed++;
          }
        } catch (error) {
          await this.log(`Test ${i + 1} threw an error: ${error.message}`, 'error');
        }
      }

      console.log('\n' + '='.repeat(50));
      await this.log(`📊 Test Results: ${passed}/${total} tests passed`);
      
      if (passed === total) {
        await this.log('🎉 All project creation workflow tests passed!', 'success');
        return true;
      } else {
        await this.log(`❌ ${total - passed} tests failed`, 'error');
        return false;
      }

    } catch (error) {
      await this.log(`Test suite failed with error: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
async function main() {
  const testSuite = new ProjectCreationWorkflowTest();
  const success = await testSuite.runAllTests();
  process.exit(success ? 0 : 1);
}

// Check if this script is being run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ProjectCreationWorkflowTest;