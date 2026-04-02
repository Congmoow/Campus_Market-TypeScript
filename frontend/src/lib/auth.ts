import { useSyncExternalStore } from 'react';
import type {
  AccessTokenResponse,
  ApiResponse,
  AuthTokenPayload,
  User,
} from '@campus-market/shared';
import request, { configureHttpClientAuth } from './http';

export const AUTH_CHANGE_EVENT = 'auth:changed';

const AUTH_ME_ENDPOINT = '/auth/me';
const AUTH_REFRESH_ENDPOINT = '/auth/refresh';
const AUTH_LOGOUT_ENDPOINT = '/auth/logout';
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

let accessToken: string | null = null;
let restoreSessionPromise: Promise<User | null> | null = null;
let authSessionState: AuthSessionState =
  typeof window === 'undefined'
    ? { status: 'unauthenticated', user: null }
    : { status: 'loading', user: null };

function emitSessionChange(): void {
  sessionListeners.forEach((listener) => listener());
}

function setSessionState(nextState: AuthSessionState): void {
  authSessionState = nextState;
  emitSessionChange();
}

function getAccessToken(): string | null {
  return accessToken;
}

function clearLegacyStoredAuthData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function setAccessToken(token: string | null): void {
  accessToken = token;
  if (!token) {
    clearLegacyStoredAuthData();
    return;
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const payload = await request.post<ApiResponse<AccessTokenResponse>>(
      AUTH_REFRESH_ENDPOINT,
      undefined,
      {
        skipAuthFailureHandler: true,
        skipAuthRefresh: true,
        skipAuthToken: true,
      },
    );

    if (!payload.success || !payload.data?.token) {
      setAccessToken(null);
      return null;
    }

    setAccessToken(payload.data.token);
    return payload.data.token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

async function fetchCurrentSessionUser(): Promise<User | null> {
  const payload = await request.get<ApiResponse<User>>(AUTH_ME_ENDPOINT, {
    skipAuthFailureHandler: true,
  });
  if (!payload.success || !payload.data) {
    return null;
  }

  return payload.data;
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
  if (restoreSessionPromise) {
    return restoreSessionPromise;
  }

  setSessionState({ status: 'loading', user: null });

  restoreSessionPromise = (async () => {
    if (!getAccessToken()) {
      const refreshedAccessToken = await refreshAccessToken();
      if (!refreshedAccessToken) {
        clearAuthState('invalid-session');
        return null;
      }
    }

    const user = await fetchCurrentSessionUser().catch(() => null);
    if (!user) {
      clearAuthState('invalid-session');
      return null;
    }

    setSessionState({ status: 'authenticated', user });
    return user;
  })().finally(() => {
    restoreSessionPromise = null;
  });

  return restoreSessionPromise;
}

export function clearAuthState(reason = 'logout'): void {
  setAccessToken(null);
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
  setAccessToken(token);
  setSessionState({
    status: 'authenticated',
    user,
  });
  dispatchAuthChanged('login');
}

export function updateAuthSessionUser(user: User): void {
  if (!getAccessToken()) {
    return;
  }

  setSessionState({
    status: 'authenticated',
    user,
  });
}

export function getCurrentUser(): (User & { token: string }) | null {
  const token = getAccessToken();
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

export async function logout(): Promise<void> {
  try {
    await request.post(AUTH_LOGOUT_ENDPOINT, undefined, {
      skipAuthFailureHandler: true,
      skipAuthRefresh: true,
      skipAuthToken: true,
    });
  } finally {
    clearAuthState('logout');
  }
}

configureHttpClientAuth({
  getAccessToken,
  refreshAccessToken,
  onUnauthorized: () => {
    clearAuthState('unauthorized');
  },
});
