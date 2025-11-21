/**
 * Project Creation Workflow Tests
 * 
 * This test suite verifies:
 * 1. Project creation form validation works correctly
 * 2. Successful project creation and API integration
 * 3. New projects appear in projects list immediately
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the API client
jest.mock('@/lib/api', () => ({
  api: {
    projects: {
      create: jest.fn(),
      list: jest.fn(),
    }
  }
}));

// Mock the form validation hook
jest.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: () => ({
    errors: {},
    validateField: jest.fn(),
    validateForm: jest.fn(() => true),
    clearAllErrors: jest.fn(),
  })
}));

import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import ProjectsListingPage from '@/app/dashboard/projects/page';
import { api } from '@/lib/api';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard/projects',
}));

describe('Project Creation Workflow', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Project Creation Form Validation', () => {
    it('should validate required project name', async () => {
      const user = userEvent.setup();
      
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Try to submit without entering a name
      const submitButton = screen.getByRole('button', { name: /create project/i });
      expect(submitButton).toBeDisabled();

      // Enter a name
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      // Submit button should now be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should validate project name length limits', async () => {
      const user = userEvent.setup();
      
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      
      // Test minimum length (should be at least 2 characters)
      await user.type(nameInput, 'A');
      const submitButton = screen.getByRole('button', { name: /create project/i });
      expect(submitButton).toBeDisabled();

      // Test valid length
      await user.clear(nameInput);
      await user.type(nameInput, 'Valid Project Name');
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Test maximum length (should not exceed 100 characters)
      await user.clear(nameInput);
      const longName = 'A'.repeat(101);
      await user.type(nameInput, longName);
      expect(submitButton).toBeDisabled();
    });

    it('should validate project name pattern', async () => {
      const user = userEvent.setup();
      
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      
      // Test invalid characters (should only allow alphanumeric, spaces, hyphens, underscores)
      await user.type(nameInput, 'Invalid@Project#Name!');
      const submitButton = screen.getByRole('button', { name: /create project/i });
      expect(submitButton).toBeDisabled();

      // Test valid characters
      await user.clear(nameInput);
      await user.type(nameInput, 'Valid-Project_Name 123');
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should validate description length limit', async () => {
      const user = userEvent.setup();
      
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      // Enter valid name
      await user.type(nameInput, 'Test Project');

      // Test description length limit (should not exceed 500 characters)
      const longDescription = 'A'.repeat(501);
      await user.type(descriptionInput, longDescription);
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      expect(submitButton).toBeDisabled();

      // Test valid description length
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'A valid project description');
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('2. Successful Project Creation and API Integration', () => {
    it('should call API with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      const mockCreate = api.projects.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: '123', name: 'Test Project' });

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill out the form
      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      await user.type(nameInput, 'Test Project');
      await user.type(descriptionInput, 'A test project description');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Verify onSubmit was called with correct data
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Project',
          description: 'A test project description'
        });
      });
    });

    it('should show loading state during project creation', async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      
      const mockCreate = api.projects.create as jest.Mock;
      mockCreate.mockReturnValue(createPromise);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill out and submit the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveCreate!({ id: '123', name: 'Test Project' });
      
      await waitFor(() => {
        expect(screen.queryByText(/creating/i)).not.toBeInTheDocument();
      });
    });

    it('should show success state after successful creation', async () => {
      const user = userEvent.setup();
      const mockCreate = api.projects.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: '123', name: 'Test Project' });

      // Mock onSubmit to simulate successful creation
      const mockOnSubmitSuccess = jest.fn().mockResolvedValue(undefined);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmitSuccess}
        />
      );

      // Fill out and submit the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText(/project created/i)).toBeInTheDocument();
        expect(screen.getByText(/test project/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSubmitError = jest.fn().mockRejectedValue(
        new Error('Failed to create project')
      );

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmitError}
        />
      );

      // Fill out and submit the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create project/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Project List Integration', () => {
    it('should refresh project list after successful creation', async () => {
      const user = userEvent.setup();
      const mockList = api.projects.list as jest.Mock;
      
      // Mock initial empty list
      mockList.mockResolvedValueOnce([]);
      
      // Mock list with new project after creation
      mockList.mockResolvedValueOnce([
        { id: '123', name: 'New Test Project', description: 'Test description' }
      ]);

      const mockOnSubmitSuccess = jest.fn().mockResolvedValue(undefined);

      // Render the projects page with modal
      render(
        <div>
          <ProjectsListingPage />
          <CreateProjectModal
            isOpen={true}
            onClose={mockOnClose}
            onSubmit={mockOnSubmitSuccess}
          />
        </div>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(1);
      });

      // Fill out and submit the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'New Test Project');
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should call onSubmit which should trigger list refresh
      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      });
    });

    it('should display new project in the list immediately', async () => {
      const mockList = api.projects.list as jest.Mock;
      mockList.mockResolvedValue([
        { 
          id: '123', 
          name: 'Newly Created Project', 
          description: 'Just created',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: 'user123'
        }
      ]);

      render(<ProjectsListingPage />);

      // Should display the project
      await waitFor(() => {
        expect(screen.getByText('Newly Created Project')).toBeInTheDocument();
        expect(screen.getByText('Just created')).toBeInTheDocument();
      });
    });

    it('should handle empty project list gracefully', async () => {
      const mockList = api.projects.list as jest.Mock;
      mockList.mockResolvedValue([]);

      render(<ProjectsListingPage />);

      // Should show empty state or no projects message
      await waitFor(() => {
        // The component should handle empty list without crashing
        expect(screen.getByText(/projects/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. Form Reset and Modal Behavior', () => {
    it('should reset form when modal is closed and reopened', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill out the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      // Close modal
      rerender(
        <CreateProjectModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Reopen modal
      rerender(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Form should be reset
      const newNameInput = screen.getByLabelText(/project name/i);
      expect(newNameInput).toHaveValue('');
    });

    it('should clear errors when modal is reopened', async () => {
      const { rerender } = render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Close and reopen modal
      rerender(
        <CreateProjectModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      rerender(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Should not show any error messages
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('5. Network Error Handling', () => {
    it('should show network error for connection issues', async () => {
      const user = userEvent.setup();
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      
      const mockOnSubmitNetworkError = jest.fn().mockRejectedValue(networkError);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmitNetworkError}
        />
      );

      // Fill out and submit the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText(/connection/i)).toBeInTheDocument();
      });
    });

    it('should provide retry functionality for network errors', async () => {
      const user = userEvent.setup();
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      
      const mockOnSubmitNetworkError = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(undefined);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmitNetworkError}
        />
      );

      // Fill out and submit the form
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');
      
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Should show retry button
      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText(/try again/i);
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(mockOnSubmitNetworkError).toHaveBeenCalledTimes(2);
      });
    });
  });
});