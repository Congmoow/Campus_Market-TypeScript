import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

type UnauthorizedHandler = (error: AxiosError) => void | Promise<void>;
type AccessTokenGetter = () => string | null;

export interface HttpRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  skipAuthFailureHandler?: boolean;
  skipAuthToken?: boolean;
}

interface HttpClientAuthBridge {
  getAccessToken: AccessTokenGetter;
  onUnauthorized: UnauthorizedHandler;
}

const defaultAccessTokenGetter: AccessTokenGetter = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('token');
};

let httpClientAuthBridge: HttpClientAuthBridge = {
  getAccessToken: defaultAccessTokenGetter,
  onUnauthorized: async () => undefined,
};

function resolveAccessToken(): string | null {
  return httpClientAuthBridge.getAccessToken();
}

async function handleUnauthorizedResponse(error: AxiosError): Promise<void> {
  // Future refresh-token support should hook in here before falling back to session cleanup.
  await httpClientAuthBridge.onUnauthorized(error);
}

type InternalHttpRequestConfig = InternalAxiosRequestConfig & HttpRequestConfig;

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

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
    if (error.response?.status === 401 && !config.skipAuthFailureHandler) {
      await handleUnauthorizedResponse(error);
    }

    return Promise.reject(error);
  },
);

const request = {
  interceptors: instance.interceptors,
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
  bridge: Partial<HttpClientAuthBridge> & Pick<HttpClientAuthBridge, 'getAccessToken'>,
): void {
  httpClientAuthBridge = {
    getAccessToken: bridge.getAccessToken,
    onUnauthorized: bridge.onUnauthorized ?? httpClientAuthBridge.onUnauthorized,
  };
}

export function isUnauthorizedResponseError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export default request;
