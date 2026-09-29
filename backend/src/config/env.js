// Loads .env from the repo root (one level above /backend) or from /backend.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config(); // fallback: backend/.env

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || '',
  // bcrypt cost factor. Shared by the seed and the auth service so they never diverge.
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
