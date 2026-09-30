// Loads .env from the repo root (one level above /backend) or from /backend.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config(); // fallback: backend/.env

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  jwtSecret: process.env.JWT_SECRET || '',
  // Session lifetime. Keep the cookie and the token in step - 7 days (NFR: JWT sessions).
  sessionDays: 7,
  // Optional. In production set it to the shared parent domain (e.g. ".example.com") so
  // app.<domain> and api.<domain> can share the session cookie. Empty is correct for localhost.
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  // bcrypt cost factor. Shared by the seed and the auth service so they never diverge.
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

// Fail fast on a missing JWT_SECRET. Called from src/index.js at startup, NOT from app.js,
// so tests can build the app without a real secret.
config.assertRuntimeConfig = () => {
  if (!config.jwtSecret) {
    const msg =
      'JWT_SECRET is empty. Set it in .env (a long random string) - sessions cannot be signed without it.';
    if (config.isProduction) {
      console.error(`FATAL: ${msg}`);
      process.exit(1);
    }
    console.warn(`WARNING: ${msg} Login and /me will fail until it is set.`);
  }
};

module.exports = config;
