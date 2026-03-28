import dotenv from 'dotenv';

dotenv.config();

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export function getJwtConfig(
  env: NodeJS.ProcessEnv = process.env
): JwtConfig {
  const secret = env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  return {
    secret,
    expiresIn: env.JWT_EXPIRATION?.trim() || '7d',
  };
}

export const jwtConfig = {
  get secret(): string {
    return getJwtConfig().secret;
  },
  get expiresIn(): string {
    return getJwtConfig().expiresIn;
  },
};
