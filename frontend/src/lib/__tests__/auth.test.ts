import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    const localStorageStub = {
      getItem: vi.fn((key: string) => (storage.has(key) ? storage.get(key)! : null)),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
      key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
      get length() {
        return storage.size;
      },
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageStub,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageStub,
      configurable: true,
    });
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it('restores the authenticated session from /api/auth/me when a token exists', async () => {
    const currentUser = {
      id: 1,
      studentId: '20230001',
      phone: '13800138000',
      role: 'ADMIN',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      profile: {
        id: 1,
        userId: 1,
        name: 'Admin User',
        studentId: '20230001',
      },
    };

    localStorage.setItem('token', 'token-123');
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: currentUser,
    });
    vi.doMock('../http', () => ({
      configureHttpClientAuth: vi.fn(),
      default: {
        get,
      },
    }));

    const { getAuthSessionState, getCurrentUser, isAuthenticated, restoreAuthSession } =
      await import('../auth');

    await expect(restoreAuthSession()).resolves.toEqual(currentUser);

    expect(get).toHaveBeenCalledWith('/auth/me', {
      skipAuthFailureHandler: true,
    });
    expect(getCurrentUser()).toMatchObject({
      id: 1,
      role: 'ADMIN',
      token: 'token-123',
    });
    expect(getAuthSessionState()).toMatchObject({
      status: 'authenticated',
      user: currentUser,
    });
    expect(isAuthenticated()).toBe(true);
  });

  it('clears stale local auth data when /api/auth/me rejects the token', async () => {
    localStorage.setItem('token', 'stale-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 9,
        role: 'ADMIN',
      }),
    );

    const get = vi.fn().mockResolvedValue({
      success: false,
      message: 'unauthorized',
    });
    vi.doMock('../http', () => ({
      configureHttpClientAuth: vi.fn(),
      default: {
        get,
      },
    }));

    const { getAuthSessionState, restoreAuthSession } = await import('../auth');

    await expect(restoreAuthSession()).resolves.toBeNull();

    expect(get).toHaveBeenCalledWith('/auth/me', {
      skipAuthFailureHandler: true,
    });
    expect(localStorage.getItem('token') ?? null).toBeNull();
    expect(localStorage.getItem('user') ?? null).toBeNull();
    expect(getAuthSessionState()).toMatchObject({
      status: 'unauthenticated',
      user: null,
    });
  });
});
