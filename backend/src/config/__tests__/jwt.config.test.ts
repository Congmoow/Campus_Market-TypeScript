import { getJwtConfig } from '../jwt.config';

describe('jwt.config', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() =>
      getJwtConfig({
        JWT_SECRET: '',
        JWT_EXPIRATION: '7d',
      } as NodeJS.ProcessEnv)
    ).toThrow('JWT_SECRET');
  });

  it('returns configured secret and expiration', () => {
    expect(
      getJwtConfig({
        JWT_SECRET: 'strong-secret',
        JWT_EXPIRATION: '15m',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      secret: 'strong-secret',
      expiresIn: '15m',
    });
  });
});
