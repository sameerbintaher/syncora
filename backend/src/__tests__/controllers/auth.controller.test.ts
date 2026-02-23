import { Request, Response } from 'express';
import { authController } from '../../controllers/auth.controller';

const mockRegister = jest.fn();
const mockLogin = jest.fn();

jest.mock('../../services/auth.service', () => ({
  authService: {
    register: (...args: unknown[]) => mockRegister(...args),
    login: (...args: unknown[]) => mockLogin(...args),
  },
}));

describe('AuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { body: {}, cookies: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('calls authService.register and returns 201 with user and token', async () => {
      const user = { id: '1', username: 'test', email: 'test@test.com' };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockRegister.mockResolvedValue({ user, tokens });

      mockReq.body = { username: 'test', email: 'test@test.com', password: 'Test1234' };

      await authController.register(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRegister).toHaveBeenCalledWith('test', 'test@test.com', 'Test1234');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user, accessToken: 'at' },
      });
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.any(Object));
    });

    it('calls next on service error', async () => {
      mockRegister.mockRejectedValue(new Error('Service error'));

      mockReq.body = { username: 'x', email: 'x@x.com', password: 'Test1234' };

      await authController.register(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    it('calls authService.login and returns 200 with user and token', async () => {
      const user = { id: '1', username: 'test', email: 'test@test.com' };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockLogin.mockResolvedValue({ user, tokens });

      mockReq.body = { email: 'test@test.com', password: 'Test1234' };

      await authController.login(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'Test1234');
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user, accessToken: 'at' },
      });
    });
  });
});
