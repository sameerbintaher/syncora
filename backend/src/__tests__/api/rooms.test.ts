import request from 'supertest';
import app from '../../app';

const getAuthToken = async (): Promise<string> => {
  const email = `rooms-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({
    username: 'roomstest',
    email,
    password: 'Test1234',
  });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Test1234' });
  return loginRes.body.data.accessToken;
};

describe('Rooms API', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  describe('GET /api/rooms', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/rooms');
      expect(res.status).toBe(401);
    });

    it('returns 200 and rooms array with valid token', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'success',
        data: { rooms: expect.any(Array) },
      });
    });
  });

  describe('Error response structure', () => {
    it('validation error returns { status, message }', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: expect.any(String),
        })
      );
    });
  });
});
