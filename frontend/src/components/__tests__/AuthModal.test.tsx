import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from '../AuthModal';

vi.mock('../../api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('../../lib/user-display', () => ({
  getUserDisplayName: vi.fn(() => 'Test User'),
}));

vi.mock('../../assets/storyset-happy-student.svg', () => ({
  default: 'student.svg',
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, layout, layoutId, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    h2: ({ children, whileHover, whileTap, layout, layoutId, ...props }: any) => (
      <h2 {...props}>{children}</h2>
    ),
    p: ({ children, whileHover, whileTap, layout, layoutId, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AuthModal forgot-password flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call the authenticated reset-password API from the forgot-password form', async () => {
    const { authApi } = await import('../../api');
    const user = userEvent.setup();

    render(
      <AuthModal
        isOpen={true}
        onClose={vi.fn()}
        onLoginSuccess={vi.fn()}
      />
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /\u5fd8\u8bb0\u5bc6\u7801/i }));
    });
    await act(async () => {
      await user.click(await screen.findByRole('button', { name: /\u91cd\u7f6e\u5bc6\u7801/i }));
    });

    await waitFor(() => {
      expect(authApi.resetPassword).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          /\u6682\u4e0d\u652f\u6301\u672a\u767b\u5f55\u76f4\u63a5\u91cd\u7f6e\u5bc6\u7801/i
        )
      ).toBeInTheDocument();
    });
  });
});
