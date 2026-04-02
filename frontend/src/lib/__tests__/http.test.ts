import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('http client auth handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('injects the bearer token from the shared auth bridge', async () => {
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'token-123',
      onUnauthorized: vi.fn(),
    });

    const requestInterceptor = (request.interceptors.request as any).handlers[0].fulfilled;
    const config = await requestInterceptor({ headers: {} });

    const authorizationHeader =
      config.headers.Authorization ?? config.headers.get?.('Authorization');

    expect(authorizationHeader).toBe('Bearer token-123');
    expect(config.withCredentials).toBe(true);
  });

  it('clears auth through the shared unauthorized handler on 401 responses', async () => {
    const onUnauthorized = vi.fn();
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'token-123',
      onUnauthorized,
    });

    const responseRejected = (request.interceptors.response as any).handlers[0].rejected;
    const error = {
      response: { status: 401 },
      config: { url: '/orders/me' },
      message: 'unauthorized',
    };

    await expect(responseRejected(error)).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(onUnauthorized).toHaveBeenCalledWith(error);
  });

  it('does not trigger the global unauthorized handler when explicitly skipped', async () => {
    const onUnauthorized = vi.fn();
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'token-123',
      onUnauthorized,
    });

    const responseRejected = (request.interceptors.response as any).handlers[0].rejected;

    await expect(
      responseRejected({
        response: { status: 401 },
        config: { url: '/auth/me', skipAuthFailureHandler: true },
        message: 'unauthorized',
      }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
