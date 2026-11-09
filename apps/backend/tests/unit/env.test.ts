import { parseEnv } from '../../src/config/env';

describe('environment configuration', () => {
  const productionSecrets = {
    JWT_SECRET: 'a'.repeat(32),
    REFRESH_TOKEN_SECRET: 'b'.repeat(32),
    COOKIE_SECRET: 'c'.repeat(32),
    DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/hrms',
    CORS_ORIGIN: 'https://hr.example.com',
  };

  it('rejects missing production secrets and service URLs', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(
      'Invalid environment configuration'
    );
  });

  it('rejects example placeholder secrets in production', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        ...productionSecrets,
        JWT_SECRET: 'replace-with-a-random-secret-of-at-least-32-characters',
      })
    ).toThrow('Invalid environment configuration');
  });

  it('rejects reused production secrets', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        ...productionSecrets,
        REFRESH_TOKEN_SECRET: productionSecrets.JWT_SECRET,
      })
    ).toThrow('Invalid environment configuration');
  });

  it('accepts explicitly configured production values', () => {
    expect(
      parseEnv({
        NODE_ENV: 'production',
        ...productionSecrets,
      }).NODE_ENV
    ).toBe('production');
  });

  it('requires an opt-in strong demo password before production demo seeding', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        ...productionSecrets,
        ENABLE_DEMO_SEED: 'true',
      })
    ).toThrow('Invalid environment configuration');

    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        ...productionSecrets,
        ENABLE_DEMO_SEED: 'true',
        DEMO_SEED_PASSWORD: 'CodeOrbit@2026!',
      })
    ).toThrow('Invalid environment configuration');

    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        ...productionSecrets,
        ENABLE_DEMO_SEED: 'true',
        DEMO_SEED_PASSWORD: 'custom-demo-Password-948!',
      })
    ).not.toThrow();
  });

  it('keeps safe development-only defaults for local work', () => {
    const config = parseEnv({ NODE_ENV: 'development' });
    expect(config.JWT_SECRET).toContain('development-only-');
    expect(config.COOKIE_SECRET).toContain('development-only-');
  });
});
