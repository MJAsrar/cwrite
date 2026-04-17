import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { api } from '@/lib/api';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('redirects to login when token is missing', async () => {
    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/auth/login');
    });
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders children when token exists and /auth/me succeeds', async () => {
    localStorage.setItem('access_token', 'valid-token');
    (api.get as jest.Mock).mockResolvedValue({ id: 'u1', email: 'u@example.com' });

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/auth/me');
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('clears tokens and redirects when /auth/me fails', async () => {
    const removeSpy = jest.spyOn(Storage.prototype, 'removeItem');
    localStorage.setItem('access_token', 'bad-token');
    localStorage.setItem('refresh_token', 'refresh-token');
    (api.get as jest.Mock).mockRejectedValue(new Error('auth failed'));

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/auth/login');
    });
    expect(removeSpy).toHaveBeenCalledWith('access_token');
    expect(removeSpy).toHaveBeenCalledWith('refresh_token');
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });
});
