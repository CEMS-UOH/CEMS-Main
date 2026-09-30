// Runs before any test module is imported (jest `setupFiles`).
// Tests must never depend on a local .env - CI has none. dotenv does not override
// variables that are already set, so these win both locally and in CI.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-not-used-anywhere-real';
process.env.BCRYPT_ROUNDS = '4'; // keep bcrypt fast in tests; production uses 12
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.COOKIE_DOMAIN = '';
