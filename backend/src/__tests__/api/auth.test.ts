import request from 'supertest';
import app from '../../app';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    };

    it('returns 201 and user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        status: 'success',
        data: {
          user: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com',
          }),
          accessToken: expect.any(String),
        },
      });
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 400 with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'invalid' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        status: 'error',
        message: expect.any(String),
      });
    });

    it('returns 400 with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, password: 'weak' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        status: 'error',
        message: expect.any(String),
      });
    });

    it('returns 409 for duplicate email', async () => {
      const dupUser = { ...validUser, email: `dup-${Date.now()}@example.com` };
      await request(app).post('/api/auth/register').send(dupUser);
      const res = await request(app)
        .post('/api/auth/register')
        .send(dupUser);

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        status: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('POST /api/auth/login', () => {
    const loginEmail = `login-${Date.now()}@example.com`;
    beforeAll(async () => {
      await request(app).post('/api/auth/register').send({
        username: 'loginuser',
        email: loginEmail,
        password: 'Test1234',
      });
    });

    it('returns 200 and tokens with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'Test1234' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'success',
        data: {
          user: expect.any(Object),
          accessToken: expect.any(String),
        },
      });
    });

    it('returns 401 with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        status: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('Error response structure', () => {
    it('404 returns consistent error format', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        status: 'error',
        message: expect.any(String),
      });
    });
  });
});
