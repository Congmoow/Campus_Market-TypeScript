import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { clearAuthState } from '../lib/auth';

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState('unauthorized');
    }

    return Promise.reject(error);
  },
);

const request = {
  interceptors: instance.interceptors,
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get<unknown, T>(url, config);
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post<unknown, T>(url, data, config);
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put<unknown, T>(url, data, config);
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.patch<unknown, T>(url, data, config);
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete<unknown, T>(url, config);
  },
};

export default request;
