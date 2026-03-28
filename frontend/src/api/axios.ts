import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../../../backend/src/types/shared';
import { clearAuthState } from '../lib/auth';

const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器：自动携带 Token
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理全局错误（如 401 未登录）
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response.data as any,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState('unauthorized');
    }

    return Promise.reject(error);
  }
);

export default instance;
