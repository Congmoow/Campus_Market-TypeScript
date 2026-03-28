import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null instead of throwing when stored user JSON is invalid', async () => {
    localStorage.setItem('user', '{bad-json');

    const { getStoredUser } = await import('../auth');

    expect(getStoredUser()).toBeNull();
  });

  it('clears auth state and dispatches a change event', async () => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    const listener = vi.fn();
    window.addEventListener('auth:changed', listener);

    const { clearAuthState } = await import('../auth');
    clearAuthState('logout');

    expect(localStorage.getItem('token') ?? null).toBeNull();
    expect(localStorage.getItem('user') ?? null).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ reason: 'logout' });
  });
});
