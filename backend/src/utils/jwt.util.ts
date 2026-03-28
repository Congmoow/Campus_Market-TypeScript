import jwt from 'jsonwebtoken';
import { getJwtConfig } from '../config/jwt.config';

export interface JwtPayload {
  id: number;
  studentId: string;
  email: string;
  role: string;
}

/**
 * 鐢熸垚 JWT token
 */
export function generateToken(payload: JwtPayload): string {
  const { secret, expiresIn } = getJwtConfig();

  return jwt.sign(payload, secret, {
    expiresIn,
  } as jwt.SignOptions);
}

/**
 * 楠岃瘉 JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const { secret } = getJwtConfig();

    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * 瑙ｇ爜 JWT token锛堜笉楠岃瘉锛?
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
}
