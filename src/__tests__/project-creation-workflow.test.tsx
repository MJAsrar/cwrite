/**
 * Integration test: project creation workflow
 * Tests the full flow from opening the modal to successful project creation
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stable mock references — must not be recreated on every render call
const mockValidateField = jest.fn().mockReturnValue(null);
const mockValidateForm = jest.fn().mockReturnValue(true);
const mockClearAllErrors = jest.fn();
let mockErrors: Record<string, string> = {};

jest.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: () => ({
    get errors() { return mockErrors; },
    validateField: mockValidateField,
    validateForm: mockValidateForm,
    clearAllErrors: mockClearAllErrors,
    clearError: jest.fn(),
    setError: jest.fn(),
    hasErrors: Object.keys(mockErrors).length > 0,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: () => '/dashboard',
}));

import CreateProjectModal from '@/components/dashboard/CreateProjectModal';

describe('Project Creation Workflow', () => {
  let mockOnSubmit: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    mockOnSubmit = jest.fn();
    mockOnClose = jest.fn();
    mockErrors = {};
    mockValidateField.mockReturnValue(null);
    mockValidateForm.mockReturnValue(true);
    mockClearAllErrors.mockClear();
  });

  describe('Modal rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <CreateProjectModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.queryByText(/new project/i)).not.toBeInTheDocument();
    });

    it('renders the modal when isOpen is true', () => {
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByText(/new project/i)).toBeInTheDocument();
    });

    it('renders the project name input', () => {
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    });

    it('renders the genre picker', () => {
      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(screen.getByText(/writing genre/i)).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('calls onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'My Novel');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'My Novel' })
        );
      });
    });

    it('does not call onSubmit when validateForm returns false', async () => {
      const user = userEvent.setup();
      mockValidateForm.mockReturnValue(false);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'x');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('shows loading state while submitting', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const pendingPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(pendingPromise);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });

      // Clean up
      resolveSubmit!();
    });
  });

  describe('Success state', () => {
    it('shows success message after successful creation', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/project created/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('shows error message on submission failure', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue(new Error('Network error'));

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel behaviour', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
