import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('axios auth interceptors', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the bearer token to outgoing requests', async () => {
    const localStorageStub = {
      getItem: vi.fn((key: string) => (key === 'token' ? 'token-123' : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageStub,
      configurable: true,
    });
    const { default: request } = await import('../axios');
    const requestInterceptor = (request.interceptors.request as any).handlers[0].fulfilled;

    const config = await requestInterceptor({ headers: {} });

    const authorizationHeader = config.headers.Authorization ?? config.headers.get?.('Authorization');
    expect(authorizationHeader).toBe('Bearer token-123');
    expect(localStorageStub.getItem).toHaveBeenCalledWith('token');
  });

  it('clears auth storage and emits an auth change event on 401 responses', async () => {
    const clearAuthState = vi.fn();
    vi.doMock('../../lib/auth', () => ({
      clearAuthState,
    }));

    const { default: request } = await import('../axios');
    const responseRejected = (request.interceptors.response as any).handlers[0].rejected;

    await expect(
      responseRejected({
        response: { status: 401 },
        config: { url: '/orders/me' },
        message: 'unauthorized',
      })
    ).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(clearAuthState).toHaveBeenCalledWith('unauthorized');
  });
});
