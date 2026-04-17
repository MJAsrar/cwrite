import React from 'react';
import '@testing-library/jest-dom/jest-globals';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('CreateProjectModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits selected genre in payload settings.genre', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn<(projectData: { name: string; description?: string; settings?: { genre: string } }) => Promise<void>>().mockResolvedValue(undefined);

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/project name/i), 'My Project');
    await user.click(screen.getByRole('button', { name: /fantasy/i }));
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'My Project',
        description: undefined,
        settings: { genre: 'fantasy' },
      });
    });
  });

  it('shows success then auto-closes after 2 seconds', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onClose = jest.fn();
    const onSubmit = jest.fn<(projectData: { name: string; description?: string; settings?: { genre: string } }) => Promise<void>>().mockResolvedValue(undefined);

    render(
      <CreateProjectModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/project name/i), 'Timed Project');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByText(/project created/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    jest.useRealTimers();
  });
});
