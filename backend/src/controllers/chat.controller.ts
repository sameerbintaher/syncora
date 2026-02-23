import { Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { AppError } from '../utils/AppError';
import { getIO } from '../config/socket';

export class ChatController {
  async createRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, memberIds, name, description } = req.body;
      const room = await chatService.createRoom(req.user!.sub, type, memberIds, name, description);
      res.status(201).json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async getRooms(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rooms = await chatService.getUserRooms(req.user!.sub);
      res.json({ status: 'success', data: { rooms } });
    } catch (err) {
      next(err);
    }
  }

  async getRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await chatService.getRoomById(req.params.roomId, req.user!.sub);
      res.json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const result = await chatService.getRoomMessages(
        req.params.roomId,
        req.user!.sub,
        cursor,
        limit
      );
      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  async searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2)
        throw new AppError('Search query must be at least 2 characters', 400);

      const currentUser = await User.findById(req.user!.sub).select('blockedUsers');
      const blockedIds = currentUser?.blockedUsers || [];

      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
        _id: { $ne: req.user!.sub, $nin: blockedIds },
      })
        .select('username email avatar isOnline lastSeen')
        .limit(20)
        .lean();

      res.json({
        status: 'success',
        data: {
          users: users.map((u: any) => ({
            id: u._id.toString(),
            _id: u._id.toString(),
            username: u.username,
            email: u.email,
            avatar: u.avatar,
            isOnline: u.isOnline,
            lastSeen: u.lastSeen,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteForMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId } = req.body;
      if (!messageId) throw new AppError('messageId required', 400);
      await chatService.deleteForMe(messageId, req.user!.sub);
      res.json({ status: 'success', message: 'Message deleted for you' });
    } catch (err) {
      next(err);
    }
  }

  async deleteForEveryone(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { messageId } = req.body;
      if (!messageId) throw new AppError('messageId required', 400);
      await chatService.deleteForEveryone(messageId, req.user!.sub);
      res.json({ status: 'success', message: 'Message deleted' });
    } catch (err) {
      next(err);
    }
  }

  async addReaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId, emoji } = req.body;
      if (!messageId || !emoji) throw new AppError('messageId and emoji required', 400);
      const message = await chatService.addReaction(messageId, req.user!.sub, emoji);
      res.json({ status: 'success', data: { message } });
    } catch (err) {
      next(err);
    }
  }

  async removeReaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId } = req.body;
      if (!messageId) throw new AppError('messageId required', 400);
      const message = await chatService.removeReaction(messageId, req.user!.sub);
      res.json({ status: 'success', data: { message } });
    } catch (err) {
      next(err);
    }
  }

  async forwardMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId, targetRoomId } = req.body;
      if (!messageId || !targetRoomId) throw new AppError('messageId and targetRoomId required', 400);
      const message = await chatService.forwardMessage(
        messageId,
        req.user!.sub,
        targetRoomId
      );
      const populated = await message.populate('sender', 'username avatar');
      const msgObj = populated.toObject ? populated.toObject() : populated;
      const io = getIO();
      if (io) io.to(targetRoomId).emit('message:new', { message: msgObj });
      res.status(201).json({ status: 'success', data: { message: populated } });
    } catch (err) {
      next(err);
    }
  }

  async updateGroupName(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const { name } = req.body;
      if (!name) throw new AppError('name required', 400);
      const room = await chatService.updateGroupName(roomId, req.user!.sub, name);
      const io = getIO();
      if (io) io.to(roomId).emit('room:updated', { room });
      res.json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async uploadGroupAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      if (!req.file) throw new AppError('No file uploaded', 400);
      const avatarPath = `/uploads/rooms/${req.file.filename}`;
      const room = await chatService.updateGroupAvatar(roomId, req.user!.sub, avatarPath);
      const io = getIO();
      if (io) io.to(roomId).emit('room:updated', { room });
      res.json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async addMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const { memberIds } = req.body;
      if (!Array.isArray(memberIds) || memberIds.length === 0) throw new AppError('memberIds array required', 400);
      const room = await chatService.addMembers(roomId, req.user!.sub, memberIds);
      const io = getIO();
      if (io) io.to(roomId).emit('room:updated', { room });
      res.json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId, userId } = req.params;
      const result = await chatService.removeMember(roomId, req.user!.sub, userId);
      const io = getIO();
      if (io) {
        io.to(roomId).emit('room:updated', result ? { room: result } : { roomId, memberRemoved: userId });
        io.to(`user:${userId}`).emit('room:left', { roomId });
      }
      if (result) res.json({ status: 'success', data: { room: result } });
      else res.json({ status: 'success', message: 'Left group' });
    } catch (err) {
      next(err);
    }
  }

  async promoteAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId, userId } = req.params;
      const room = await chatService.promoteAdmin(roomId, req.user!.sub, userId);
      const io = getIO();
      if (io) io.to(roomId).emit('room:updated', { room });
      res.json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async demoteAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId, userId } = req.params;
      const room = await chatService.demoteAdmin(roomId, req.user!.sub, userId);
      const io = getIO();
      if (io) io.to(roomId).emit('room:updated', { room });
      res.json({ status: 'success', data: { room } });
    } catch (err) {
      next(err);
    }
  }

  async leaveGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      await chatService.leaveGroup(roomId, req.user!.sub);
      const io = getIO();
      if (io) {
        io.to(`user:${req.user!.sub}`).emit('room:left', { roomId });
        const room = await Room.findById(roomId)
          .populate('members', 'username avatar isOnline lastSeen')
          .populate('admins', 'username')
          .populate('lastMessage')
          .lean();
        if (room) io.to(roomId).emit('room:updated', { room });
      }
      res.json({ status: 'success', message: 'Left group' });
    } catch (err) {
      next(err);
    }
  }
}

export const chatController = new ChatController();
