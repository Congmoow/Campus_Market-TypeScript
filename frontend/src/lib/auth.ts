/**
 * 认证工具函数
 */

export const AUTH_CHANGE_EVENT = 'auth:changed';

interface JwtPayload {
  id: number;
  studentId: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

type StoredUser = Record<string, any>;

/**
 * 解析 JWT token
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * 检查 token 是否过期
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }
  return Date.now() >= payload.exp * 1000;
}

export function dispatchAuthChanged(reason: string): void {
  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGE_EVENT, {
      detail: { reason },
    })
  );
}

export function clearAuthState(reason = 'logout'): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  dispatchAuthChanged(reason);
}

export function getStoredUser<T = StoredUser>(): T | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as T;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function setAuthSession(token: string, user: StoredUser): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  dispatchAuthChanged('login');
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): (JwtPayload & { token: string } & StoredUser) | null {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token || !user) {
    return null;
  }

  if (isTokenExpired(token)) {
    clearAuthState('expired');
    return null;
  }

  const payload = parseJwt(token);
  if (!payload) {
    clearAuthState('invalid-token');
    return null;
  }

  return {
    ...payload,
    token,
    ...user,
  };
}

/**
 * 检查是否为管理员
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'ADMIN';
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * 登出
 */
export function logout(): void {
  clearAuthState('logout');
}
