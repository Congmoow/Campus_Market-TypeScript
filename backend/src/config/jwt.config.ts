import dotenv from 'dotenv';

dotenv.config();

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export function getJwtConfig(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const secret = env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  const accessTokenExpiresIn =
    env.JWT_ACCESS_EXPIRATION?.trim() || env.JWT_EXPIRATION?.trim() || '15m';
  const refreshTokenExpiresIn = env.JWT_REFRESH_EXPIRATION?.trim() || '7d';

  return {
    secret,
    expiresIn: accessTokenExpiresIn,
    accessTokenExpiresIn,
    refreshTokenExpiresIn,
  };
}

export const jwtConfig = {
  get secret(): string {
    return getJwtConfig().secret;
  },
  get expiresIn(): string {
    return getJwtConfig().expiresIn;
  },
  get accessTokenExpiresIn(): string {
    return getJwtConfig().accessTokenExpiresIn;
  },
  get refreshTokenExpiresIn(): string {
    return getJwtConfig().refreshTokenExpiresIn;
  },
};
