import type { AuthTokenPayload } from '@campus-market/shared';

export const AUTH_CHANGE_EVENT = 'auth:changed';

type StoredUser = Record<string, unknown>;

export function parseJwt(token: string): AuthTokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) {
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

export function getCurrentUser():
  | (AuthTokenPayload & { token: string } & StoredUser)
  | null {
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

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'ADMIN';
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function logout(): void {
  clearAuthState('logout');
}
