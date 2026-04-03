import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('http client auth handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('injects the bearer token from the shared auth bridge', async () => {
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'token-123',
      refreshAccessToken: vi.fn().mockResolvedValue(null),
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
      refreshAccessToken: vi.fn().mockResolvedValue(null),
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

  it('refreshes once and retries the original request after a 401', async () => {
    const retryResponse = { success: true };
    const refreshAccessToken = vi.fn().mockResolvedValue('fresh-token');
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'stale-token',
      refreshAccessToken,
      onUnauthorized: vi.fn(),
    });

    const requestSpy = vi.spyOn(request, 'request').mockResolvedValue(retryResponse);
    const responseRejected = (request.interceptors.response as any).handlers[0].rejected;

    await expect(
      responseRejected({
        response: { status: 401 },
        config: { url: '/orders/me', headers: {} },
        message: 'unauthorized',
      }),
    ).resolves.toBe(retryResponse);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/orders/me',
        _retry: true,
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      }),
    );
  });

  it('does not trigger the global unauthorized handler when explicitly skipped', async () => {
    const onUnauthorized = vi.fn();
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'token-123',
      refreshAccessToken: vi.fn().mockResolvedValue(null),
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

  it('reuses an in-flight refresh request for concurrent 401 responses', async () => {
    let resolveRefresh: ((value: string | null) => void) | null = null;
    const refreshAccessToken = vi.fn().mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { configureHttpClientAuth, default: request } = await import('../http');

    configureHttpClientAuth({
      getAccessToken: () => 'stale-token',
      refreshAccessToken,
      onUnauthorized: vi.fn(),
    });

    const requestSpy = vi.spyOn(request, 'request').mockResolvedValue({ success: true });
    const responseRejected = (request.interceptors.response as any).handlers[0].rejected;

    const first = responseRejected({
      response: { status: 401 },
      config: { url: '/orders/1', headers: {} },
    });
    const second = responseRejected({
      response: { status: 401 },
      config: { url: '/orders/2', headers: {} },
    });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    expect(resolveRefresh).not.toBeNull();
    resolveRefresh!('fresh-token');
    await Promise.all([first, second]);

    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('returns the response payload instead of the raw AxiosResponse object', async () => {
    const payload = {
      success: true,
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 20,
        number: 0,
      },
    };

    vi.doMock('axios', () => {
      const createInterceptors = () => ({
        handlers: [] as Array<{ fulfilled: unknown; rejected: unknown }>,
        use(fulfilled: unknown, rejected: unknown) {
          this.handlers.push({ fulfilled, rejected });
        },
      });

      const get = vi.fn().mockResolvedValue({
        data: payload,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      return {
        default: {
          create: vi.fn(() => ({
            interceptors: {
              request: createInterceptors(),
              response: createInterceptors(),
            },
            request: vi.fn(),
            get,
            post: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
          })),
        },
        isAxiosError: vi.fn(() => false),
      };
    });

    const { default: request } = await import('../http');

    await expect(request.get('/products', { params: { page: 0 } })).resolves.toEqual(payload);
  });
});
