// Prisma is mocked so tests run without a real database (pattern to reuse in other tests).
jest.mock('../src/lib/prisma', () => ({ $queryRaw: jest.fn() }));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');

describe('health', () => {
  it('GET /health returns success', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('up');
  });

  it('GET /health/db returns 200 when the database answers', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app).get('/health/db');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('up');
  });

  it('GET /health/db returns 503 when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/health/db');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_DOWN');
  });

  it('unknown route returns the standard 404 shape', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('CORS allows the configured frontend origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
