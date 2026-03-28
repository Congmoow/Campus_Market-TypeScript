import { buildCorsOptions } from '../app';

describe('buildCorsOptions', () => {
  it('allows requests from configured frontend origin', (done) => {
    const options = buildCorsOptions({
      FRONTEND_URL: 'http://localhost:5173',
    } as NodeJS.ProcessEnv);
    const origin = options.origin as (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => void;

    expect(typeof options.origin).toBe('function');

    origin(
      'http://localhost:5173',
      (error: Error | null, allowed?: boolean) => {
        expect(error).toBeNull();
        expect(allowed).toBe(true);
        done();
      }
    );
  });

  it('rejects requests from unknown origins', (done) => {
    const options = buildCorsOptions({
      FRONTEND_URL: 'http://localhost:5173',
    } as NodeJS.ProcessEnv);
    const origin = options.origin as (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => void;

    origin(
      'http://evil.example.com',
      (error: Error | null, allowed?: boolean) => {
        expect(error).toBeInstanceOf(Error);
        expect(allowed).toBeUndefined();
        done();
      }
    );
  });

  it('allows requests without an origin header', (done) => {
    const options = buildCorsOptions({
      FRONTEND_URL: 'http://localhost:5173',
    } as NodeJS.ProcessEnv);
    const origin = options.origin as (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => void;

    origin(
      undefined,
      (error: Error | null, allowed?: boolean) => {
        expect(error).toBeNull();
        expect(allowed).toBe(true);
        done();
      }
    );
  });
});
