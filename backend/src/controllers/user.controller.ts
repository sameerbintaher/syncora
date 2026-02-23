import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { AppError } from '../utils/AppError';

export class UserController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!.sub);
      res.json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.userId, req.user!.sub);
      res.json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, bio } = req.body;
      const user = await userService.updateProfile(req.user!.sub, { username, bio });
      res.json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const user = await userService.updateAvatar(req.user!.sub, req.file.filename);
      res.json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) throw new AppError('Search query must be at least 2 characters', 400);
      const users = await userService.searchUsers(query, req.user!.sub);
      res.json({ status: 'success', data: { users } });
    } catch (err) {
      next(err);
    }
  }

  async blockUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.blockUser(req.user!.sub, req.params.userId);
      res.json({ status: 'success', message: 'User blocked' });
    } catch (err) {
      next(err);
    }
  }

  async unblockUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.unblockUser(req.user!.sub, req.params.userId);
      res.json({ status: 'success', message: 'User unblocked' });
    } catch (err) {
      next(err);
    }
  }

  async getBlockedUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getBlockedUsers(req.user!.sub);
      res.json({ status: 'success', data: { users } });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
