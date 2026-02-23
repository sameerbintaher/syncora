import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { AppError } from '../utils/AppError';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;
      const { user, tokens } = await authService.register(username, email, password);

      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      res.status(201).json({
        status: 'success',
        data: { user, accessToken: tokens.accessToken },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, tokens } = await authService.login(email, password);

      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      res.json({
        status: 'success',
        data: { user, accessToken: tokens.accessToken },
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) throw new AppError('Refresh token not provided', 401);

      const tokens = await authService.refreshTokens(refreshToken);
      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      res.json({
        status: 'success',
        data: { accessToken: tokens.accessToken },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (req.user && refreshToken) {
        await authService.logout(req.user.sub, refreshToken);
      }

      res.clearCookie('refreshToken');
      res.json({ status: 'success', message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ status: 'success', data: { user: req.user } });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
