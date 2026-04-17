import React from 'react';
import { render, screen } from '@testing-library/react';

// Stable mock references — must not be recreated on every render
const mockValidateField = jest.fn();
const mockValidateForm = jest.fn(() => true);
const mockClearAllErrors = jest.fn();

jest.mock('@/lib/api', () => ({ api: { projects: { create: jest.fn(), list: jest.fn() } } }));
jest.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: () => ({
    errors: {},
    validateField: mockValidateField,
    validateForm: mockValidateForm,
    clearAllErrors: mockClearAllErrors,
  }),
}));
jest.mock('@/app/dashboard/projects/page', () => () => React.createElement('div', null, 'Projects'));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: () => '/',
}));

import CreateProjectModal from '@/components/dashboard/CreateProjectModal';

test('smoke: CreateProjectModal renders without crashing', () => {
  render(
    React.createElement(CreateProjectModal, {
      isOpen: true,
      onClose: jest.fn(),
      onSubmit: jest.fn(),
    })
  );
  expect(screen.getByText(/project name/i)).toBeInTheDocument();
});
