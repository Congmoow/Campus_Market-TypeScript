import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '@campus-market/shared';
import { getJwtConfig } from '../config/jwt.config';

export function generateToken(payload: AuthTokenPayload): string {
  const { secret, expiresIn } = getJwtConfig();

  return jwt.sign(payload, secret, {
    expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    const { secret } = getJwtConfig();
    return jwt.verify(token, secret) as AuthTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function decodeToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.decode(token) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}
