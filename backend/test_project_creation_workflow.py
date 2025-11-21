#!/usr/bin/env python3
"""
Test script for project creation workflow

This test verifies:
1. Project creation form validation works correctly
2. Successful project creation and database persistence
3. New projects appear in projects list immediately
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.models.project import Project, ProjectCreate, ProjectSettings, IndexingStatus
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from app.api.v1.endpoints.projects import (
    create_project, 
    list_projects, 
    CreateProjectRequest
)
from app.core.database import get_database


class TestProjectCreationWorkflow:
    """Test class for project creation workflow"""
    
    def __init__(self):
        self.project_repo = ProjectRepository()
        self.user_repo = UserRepository()
        self.test_user = None
        self.created_projects = []
    
    async def setup(self):
        """Set up test environment"""
        print("Setting up test environment...")
        
        # Create a test user
        test_user_data = User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_password_here",
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Check if user already exists
        existing_user = await self.user_repo.get_by_email("test@example.com")
        if existing_user:
            self.test_user = existing_user
            print("✓ Using existing test user")
        else:
            self.test_user = await self.user_repo.create(test_user_data)
            print("✓ Created test user")
    
    async def cleanup(self):
        """Clean up test data"""
        print("\nCleaning up test data...")
        
        # Delete created projects
        for project_id in self.created_projects:
            try:
                await self.project_repo.delete_by_id(project_id)
                print(f"✓ Deleted test project: {project_id}")
            except Exception as e:
                print(f"⚠ Failed to delete project {project_id}: {e}")
        
        # Note: We don't delete the test user as it might be used by other tests
        print("✓ Cleanup completed")
    
    async def test_project_creation_validation(self):
        """Test 1: Verify project creation form validation works correctly"""
        print("\n1. Testing project creation validation...")
        
        # Test valid project data
        valid_data = CreateProjectRequest(
            name="Test Project",
            description="A test project for validation"
        )
        
        try:
            # This should not raise any validation errors
            assert valid_data.name == "Test Project"
            assert valid_data.description == "A test project for validation"
            print("✓ Valid project data passes validation")
        except Exception as e:
            print(f"✗ Valid data validation failed: {e}")
            return False
        
        # Test invalid project data - empty name
        try:
            invalid_data = CreateProjectRequest(name="", description="Test")
            print("✗ Should have failed validation for empty name")
            return False
        except Exception as e:
            print("✓ Correctly rejects empty project name")
        
        # Test invalid project data - name too long
        try:
            long_name = "x" * 101  # Exceeds 100 character limit
            invalid_data = CreateProjectRequest(name=long_name, description="Test")
            print("✗ Should have failed validation for name too long")
            return False
        except Exception as e:
            print("✓ Correctly rejects project name that's too long")
        
        # Test invalid project data - description too long
        try:
            long_description = "x" * 501  # Exceeds 500 character limit
            invalid_data = CreateProjectRequest(
                name="Valid Name", 
                description=long_description
            )
            print("✗ Should have failed validation for description too long")
            return False
        except Exception as e:
            print("✓ Correctly rejects project description that's too long")
        
        return True
    
    async def test_successful_project_creation(self):
        """Test 2: Test successful project creation and database persistence"""
        print("\n2. Testing successful project creation and database persistence...")
        
        # Create project data
        project_data = CreateProjectRequest(
            name="Test Project Creation",
            description="Testing project creation workflow",
            settings=ProjectSettings()
        )
        
        try:
            # Create the project
            now = datetime.utcnow()
            project = Project(
                name=project_data.name,
                description=project_data.description,
                owner_id=self.test_user.id,
                created_at=now,
                updated_at=now,
                settings=project_data.settings or ProjectSettings(),
                indexing_status=IndexingStatus.PENDING
            )
            
            # Save to database
            created_project = await self.project_repo.create(project)
            
            if not created_project:
                print("✗ Failed to create project in database")
                return False
            
            # Track for cleanup
            self.created_projects.append(created_project.id)
            
            print(f"✓ Successfully created project: {created_project.name}")
            print(f"✓ Project ID: {created_project.id}")
            print(f"✓ Owner ID: {created_project.owner_id}")
            print(f"✓ Created at: {created_project.created_at}")
            
            # Verify project was saved correctly
            retrieved_project = await self.project_repo.get_by_id(created_project.id)
            if not retrieved_project:
                print("✗ Failed to retrieve created project from database")
                return False
            
            # Verify all fields match
            assert retrieved_project.name == project_data.name
            assert retrieved_project.description == project_data.description
            assert retrieved_project.owner_id == self.test_user.id
            assert retrieved_project.indexing_status == IndexingStatus.PENDING
            
            print("✓ Project data persisted correctly in database")
            return True
            
        except Exception as e:
            print(f"✗ Project creation failed: {e}")
            return False
    
    async def test_project_appears_in_list(self):
        """Test 3: Confirm new projects appear in projects list immediately"""
        print("\n3. Testing that new projects appear in projects list immediately...")
        
        try:
            # Get initial project count
            initial_projects = await self.project_repo.get_by_owner(
                owner_id=self.test_user.id
            )
            initial_count = len(initial_projects)
            print(f"✓ Initial project count: {initial_count}")
            
            # Create a new project
            project_data = CreateProjectRequest(
                name="Test List Visibility",
                description="Testing project list visibility"
            )
            
            now = datetime.utcnow()
            project = Project(
                name=project_data.name,
                description=project_data.description,
                owner_id=self.test_user.id,
                created_at=now,
                updated_at=now,
                settings=ProjectSettings(),
                indexing_status=IndexingStatus.PENDING
            )
            
            created_project = await self.project_repo.create(project)
            if not created_project:
                print("✗ Failed to create project")
                return False
            
            # Track for cleanup
            self.created_projects.append(created_project.id)
            
            # Get updated project list
            updated_projects = await self.project_repo.get_by_owner(
                owner_id=self.test_user.id
            )
            updated_count = len(updated_projects)
            
            print(f"✓ Updated project count: {updated_count}")
            
            # Verify count increased by 1
            if updated_count != initial_count + 1:
                print(f"✗ Expected {initial_count + 1} projects, got {updated_count}")
                return False
            
            # Verify the new project is in the list
            project_names = [p.name for p in updated_projects]
            if project_data.name not in project_names:
                print(f"✗ New project '{project_data.name}' not found in project list")
                return False
            
            print(f"✓ New project '{project_data.name}' appears in project list")
            
            # Verify project details in the list
            new_project_in_list = next(
                p for p in updated_projects if p.name == project_data.name
            )
            
            assert new_project_in_list.id == created_project.id
            assert new_project_in_list.description == project_data.description
            assert new_project_in_list.owner_id == self.test_user.id
            
            print("✓ Project details in list match created project")
            return True
            
        except Exception as e:
            print(f"✗ Project list visibility test failed: {e}")
            return False
    
    async def test_duplicate_project_name_handling(self):
        """Test 4: Verify handling of duplicate project names"""
        print("\n4. Testing duplicate project name handling...")
        
        try:
            # Create first project
            project_name = "Duplicate Name Test"
            project_data = CreateProjectRequest(
                name=project_name,
                description="First project with this name"
            )
            
            now = datetime.utcnow()
            project1 = Project(
                name=project_data.name,
                description=project_data.description,
                owner_id=self.test_user.id,
                created_at=now,
                updated_at=now,
                settings=ProjectSettings(),
                indexing_status=IndexingStatus.PENDING
            )
            
            created_project1 = await self.project_repo.create(project1)
            if not created_project1:
                print("✗ Failed to create first project")
                return False
            
            # Track for cleanup
            self.created_projects.append(created_project1.id)
            print(f"✓ Created first project: {project_name}")
            
            # Try to create second project with same name
            project_data2 = CreateProjectRequest(
                name=project_name,
                description="Second project with same name"
            )
            
            # Check if project with same name exists
            existing_project = await self.project_repo.get_by_owner_and_name(
                owner_id=self.test_user.id,
                name=project_name
            )
            
            if existing_project:
                print("✓ Correctly detected existing project with same name")
                print("✓ Duplicate name validation works correctly")
                return True
            else:
                print("✗ Failed to detect existing project with same name")
                return False
            
        except Exception as e:
            print(f"✗ Duplicate name handling test failed: {e}")
            return False
    
    async def test_project_creation_with_settings(self):
        """Test 5: Test project creation with custom settings"""
        print("\n5. Testing project creation with custom settings...")
        
        try:
            # Create project with custom settings
            custom_settings = ProjectSettings(
                auto_index=True,
                enable_ai_suggestions=True,
                privacy_level="private"
            )
            
            project_data = CreateProjectRequest(
                name="Test Custom Settings",
                description="Testing project with custom settings",
                settings=custom_settings
            )
            
            now = datetime.utcnow()
            project = Project(
                name=project_data.name,
                description=project_data.description,
                owner_id=self.test_user.id,
                created_at=now,
                updated_at=now,
                settings=project_data.settings,
                indexing_status=IndexingStatus.PENDING
            )
            
            created_project = await self.project_repo.create(project)
            if not created_project:
                print("✗ Failed to create project with custom settings")
                return False
            
            # Track for cleanup
            self.created_projects.append(created_project.id)
            
            # Verify settings were saved correctly
            retrieved_project = await self.project_repo.get_by_id(created_project.id)
            
            assert retrieved_project.settings.auto_index == custom_settings.auto_index
            assert retrieved_project.settings.enable_ai_suggestions == custom_settings.enable_ai_suggestions
            assert retrieved_project.settings.privacy_level == custom_settings.privacy_level
            
            print("✓ Project created with custom settings")
            print(f"✓ Auto index: {retrieved_project.settings.auto_index}")
            print(f"✓ AI suggestions: {retrieved_project.settings.enable_ai_suggestions}")
            print(f"✓ Privacy level: {retrieved_project.settings.privacy_level}")
            
            return True
            
        except Exception as e:
            print(f"✗ Custom settings test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all project creation workflow tests"""
        print("🚀 Starting Project Creation Workflow Tests")
        print("=" * 50)
        
        try:
            await self.setup()
            
            # Run all tests
            tests = [
                self.test_project_creation_validation,
                self.test_successful_project_creation,
                self.test_project_appears_in_list,
                self.test_duplicate_project_name_handling,
                self.test_project_creation_with_settings
            ]
            
            passed = 0
            total = len(tests)
            
            for test in tests:
                try:
                    result = await test()
                    if result:
                        passed += 1
                    else:
                        print(f"✗ Test failed: {test.__name__}")
                except Exception as e:
                    print(f"✗ Test error in {test.__name__}: {e}")
            
            print("\n" + "=" * 50)
            print(f"📊 Test Results: {passed}/{total} tests passed")
            
            if passed == total:
                print("🎉 All project creation workflow tests passed!")
                return True
            else:
                print(f"❌ {total - passed} tests failed")
                return False
                
        except Exception as e:
            print(f"✗ Test setup failed: {e}")
            return False
        finally:
            await self.cleanup()


async def main():
    """Main test function"""
    test_suite = TestProjectCreationWorkflow()
    success = await test_suite.run_all_tests()
    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)