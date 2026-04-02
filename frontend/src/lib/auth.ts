import { useSyncExternalStore } from 'react';
import type { ApiResponse, AuthTokenPayload, User } from '@campus-market/shared';
import request, { configureHttpClientAuth } from './http';

export const AUTH_CHANGE_EVENT = 'auth:changed';

const AUTH_ME_ENDPOINT = '/auth/me';
const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

type StoredUser = Record<string, unknown>;
type SessionListener = () => void;

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthSessionState {
  status: AuthStatus;
  user: User | null;
}

const sessionListeners = new Set<SessionListener>();

let restoreSessionPromise: Promise<User | null> | null = null;
let authSessionState: AuthSessionState = getStoredToken()
  ? { status: 'loading', user: null }
  : { status: 'unauthenticated', user: null };

function emitSessionChange(): void {
  sessionListeners.forEach((listener) => listener());
}

function setSessionState(nextState: AuthSessionState): void {
  authSessionState = nextState;
  emitSessionChange();
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function clearStoredAuthData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function setStoredToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(USER_STORAGE_KEY);
}

async function fetchCurrentSessionUser(token: string): Promise<User | null> {
  if (!token) {
    return null;
  }

  const payload = await request.get<ApiResponse<User>>(AUTH_ME_ENDPOINT, {
    skipAuthFailureHandler: true,
  });
  if (!payload.success || !payload.data) {
    return null;
  }

  return payload.data;
}

function handleStorageAuthChange(event: StorageEvent): void {
  if (event.storageArea !== localStorage) {
    return;
  }

  if (event.key && event.key !== TOKEN_STORAGE_KEY && event.key !== USER_STORAGE_KEY) {
    return;
  }

  const token = getStoredToken();
  if (!token) {
    setSessionState({ status: 'unauthenticated', user: null });
    return;
  }

  void restoreAuthSession();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageAuthChange);
}

export function parseJwt(token: string): AuthTokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
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
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGE_EVENT, {
      detail: { reason },
    }),
  );
}

export function subscribeAuthSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);

  return () => {
    sessionListeners.delete(listener);
  };
}

export function getAuthSessionState(): AuthSessionState {
  return authSessionState;
}

export function useAuthSession(): AuthSessionState {
  return useSyncExternalStore(subscribeAuthSession, getAuthSessionState, getAuthSessionState);
}

export async function restoreAuthSession(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) {
    clearStoredAuthData();
    setSessionState({ status: 'unauthenticated', user: null });
    return null;
  }

  if (restoreSessionPromise) {
    return restoreSessionPromise;
  }

  setSessionState({ status: 'loading', user: null });

  restoreSessionPromise = fetchCurrentSessionUser(token)
    .then((user) => {
      if (!user) {
        clearAuthState('invalid-session');
        return null;
      }

      setSessionState({ status: 'authenticated', user });
      return user;
    })
    .catch(() => {
      clearAuthState('invalid-session');
      return null;
    })
    .finally(() => {
      restoreSessionPromise = null;
    });

  return restoreSessionPromise;
}

export function clearAuthState(reason = 'logout'): void {
  clearStoredAuthData();
  setSessionState({ status: 'unauthenticated', user: null });
  dispatchAuthChanged(reason);
}

export function getStoredUser<T = StoredUser>(): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as T;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function setAuthSession(token: string, user: User): void {
  setStoredToken(token);
  setSessionState({
    status: 'authenticated',
    user,
  });
  dispatchAuthChanged('login');
}

export function updateAuthSessionUser(user: User): void {
  if (!getStoredToken()) {
    return;
  }

  setSessionState({
    status: 'authenticated',
    user,
  });
}

export function getCurrentUser(): (User & { token: string }) | null {
  const token = getStoredToken();
  const { user } = authSessionState;

  if (!token || !user) {
    return null;
  }

  return {
    ...user,
    token,
  };
}

export function isAdmin(): boolean {
  return authSessionState.status === 'authenticated' && authSessionState.user?.role === 'ADMIN';
}

export function isAuthenticated(): boolean {
  return authSessionState.status === 'authenticated';
}

export function logout(): void {
  clearAuthState('logout');
}

configureHttpClientAuth({
  getAccessToken: getStoredToken,
  onUnauthorized: () => {
    clearAuthState('unauthorized');
  },
});
