import type { CookieOptions, Request, Response } from 'express';
import { getJwtConfig } from '../config/jwt.config';
import { durationToMs } from './duration.util';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

type SameSite = 'lax' | 'strict' | 'none';

function getRefreshTokenSameSite(env: NodeJS.ProcessEnv = process.env): SameSite {
  const sameSite = env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
  if (sameSite === 'strict' || sameSite === 'none' || sameSite === 'lax') {
    return sameSite;
  }

  return 'lax';
}

export function getRefreshTokenCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const { refreshTokenExpiresIn } = getJwtConfig(env);
  const secure = env.AUTH_COOKIE_SECURE?.trim()
    ? env.AUTH_COOKIE_SECURE.trim() === 'true'
    : env.NODE_ENV === 'production';
  const domain = env.AUTH_COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    sameSite: getRefreshTokenSameSite(env),
    secure,
    path: env.AUTH_COOKIE_PATH?.trim() || '/api/auth',
    maxAge: durationToMs(refreshTokenExpiresIn),
    ...(domain ? { domain } : {}),
  };
}

export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions(env));
}

export function clearRefreshTokenCookie(res: Response, env: NodeJS.ProcessEnv = process.env): void {
  const options = getRefreshTokenCookieOptions(env);

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    ...(options.domain ? { domain: options.domain } : {}),
  });
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookieEntry of cookies) {
    const [rawName, ...rawValueParts] = cookieEntry.trim().split('=');
    if (rawName !== REFRESH_TOKEN_COOKIE_NAME) {
      continue;
    }

    return decodeURIComponent(rawValueParts.join('='));
  }

  return null;
}
