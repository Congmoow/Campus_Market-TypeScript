import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

type UnauthorizedHandler = (error: AxiosError) => void | Promise<void>;
type AccessTokenGetter = () => string | null;
type AccessTokenRefresher = () => Promise<string | null>;

export interface HttpRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  skipAuthFailureHandler?: boolean;
  skipAuthToken?: boolean;
  skipAuthRefresh?: boolean;
  _retry?: boolean;
}

interface HttpClientAuthBridge {
  getAccessToken: AccessTokenGetter;
  refreshAccessToken: AccessTokenRefresher;
  onUnauthorized: UnauthorizedHandler;
}

const defaultAccessTokenGetter: AccessTokenGetter = () => null;

let refreshAccessTokenPromise: Promise<string | null> | null = null;
let httpClientAuthBridge: HttpClientAuthBridge = {
  getAccessToken: defaultAccessTokenGetter,
  refreshAccessToken: async () => null,
  onUnauthorized: async () => undefined,
};

type InternalHttpRequestConfig = InternalAxiosRequestConfig & HttpRequestConfig;

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

function isRefreshRequest(config: HttpRequestConfig): boolean {
  return typeof config.url === 'string' && config.url.includes('/auth/refresh');
}

function resolveAccessToken(): string | null {
  return httpClientAuthBridge.getAccessToken();
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (refreshAccessTokenPromise) {
    return refreshAccessTokenPromise;
  }

  refreshAccessTokenPromise = httpClientAuthBridge
    .refreshAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshAccessTokenPromise = null;
    });

  return refreshAccessTokenPromise;
}

async function retryRequest<T = unknown>(config: HttpRequestConfig): Promise<T> {
  return instance.request<unknown, T>(config);
}

instance.interceptors.request.use(
  (config: InternalHttpRequestConfig) => {
    config.withCredentials = config.withCredentials ?? true;

    if (config.skipAuthToken) {
      return config;
    }

    const token = resolveAccessToken();
    if (!token) {
      return config;
    }

    config.headers = config.headers ?? {};
    const headers = config.headers as Record<string, string> & {
      get?: (name: string) => string | undefined;
    };

    if (!headers.Authorization && !headers.get?.('Authorization')) {
      headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = (error.config ?? {}) as HttpRequestConfig;

    if (error.response?.status !== 401 || config.skipAuthFailureHandler) {
      return Promise.reject(error);
    }

    if (config._retry) {
      await httpClientAuthBridge.onUnauthorized(error);
      return Promise.reject(error);
    }

    if (!config.skipAuthRefresh && !isRefreshRequest(config)) {
      const refreshedAccessToken = await refreshAccessTokenOnce();
      if (refreshedAccessToken) {
        const retryConfig: HttpRequestConfig = {
          ...config,
          _retry: true,
          headers: {
            ...(config.headers as Record<string, string> | undefined),
            Authorization: `Bearer ${refreshedAccessToken}`,
          },
        };

        return request.request(retryConfig);
      }
    }

    await httpClientAuthBridge.onUnauthorized(error);
    return Promise.reject(error);
  },
);

const request = {
  interceptors: instance.interceptors,
  request<T>(config: HttpRequestConfig): Promise<T> {
    return retryRequest<T>(config);
  },
  get<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    return instance.get<unknown, T>(url, config);
  },
  post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return instance.post<unknown, T>(url, data, config);
  },
  put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return instance.put<unknown, T>(url, data, config);
  },
  patch<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return instance.patch<unknown, T>(url, data, config);
  },
  delete<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    return instance.delete<unknown, T>(url, config);
  },
};

export function configureHttpClientAuth(
  bridge: Partial<HttpClientAuthBridge> &
    Pick<HttpClientAuthBridge, 'getAccessToken' | 'refreshAccessToken'>,
): void {
  httpClientAuthBridge = {
    getAccessToken: bridge.getAccessToken,
    refreshAccessToken: bridge.refreshAccessToken,
    onUnauthorized: bridge.onUnauthorized ?? httpClientAuthBridge.onUnauthorized,
  };
}

export function isUnauthorizedResponseError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export default request;
