import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { chatService } from '../services/chat.service';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { logger } from '../utils/logger';

const DEDUP_TTL_MS = 10000; // 10s window for duplicate detection
const dedupCache = new Map<string, { messageId: string; ts: number }>();

function cleanupDedupCache() {
  const now = Date.now();
  for (const [key, val] of dedupCache.entries()) {
    if (now - val.ts > DEDUP_TTL_MS) dedupCache.delete(key);
  }
}
setInterval(cleanupDedupCache, 5000);

interface AuthenticatedSocket extends Socket {
  user: TokenPayload;
}

export function initializeSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const user = verifyAccessToken(token);
      (socket as AuthenticatedSocket).user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.user.sub;

    logger.debug('Socket connected', { userId, socketId: socket.id });

    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('user:online', { userId });

    socket.join(`user:${userId}`);

    socket.on(
      'message:send',
      async (data: {
        roomId: string;
        content: string;
        type?: 'text' | 'image' | 'file' | 'emoji';
        clientMessageId?: string;
        reply?: { messageId: string; content: string; senderUsername: string };
        forward?: { originalMessageId: string; originalSenderId: string };
        mentions?: { userId: string; username: string }[];
      }) => {
        try {
          const dedupKey = data.clientMessageId
            ? `${userId}:${data.roomId}:${data.clientMessageId}`
            : null;
          if (dedupKey) {
            const cached = dedupCache.get(dedupKey);
            if (cached) {
              const existing = await Message.findById(cached.messageId)
                .populate('sender', 'username avatar')
                .lean();
              if (existing) {
                io.to(data.roomId).emit('message:new', { message: existing });
                return;
              }
            }
          }

          const message = await chatService.saveMessage(
            data.roomId,
            userId,
            data.content,
            data.type || 'text',
            { reply: data.reply, forward: data.forward, mentions: data.mentions }
          );

          if (dedupKey) {
            dedupCache.set(dedupKey, {
              messageId: (message._id as any).toString(),
              ts: Date.now(),
            });
          }

          const populated = await message.populate('sender', 'username avatar');
          const msgObj = populated.toObject ? populated.toObject() : populated;
          io.to(data.roomId).emit('message:new', { message: msgObj });
        } catch (err: any) {
          socket.emit('error', { message: err.message });
        }
      }
    );

    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        const message = await chatService.editMessage(data.messageId, userId, data.content);
        const roomId = (message.room as any).toString();
        const msgObj = message.toObject ? message.toObject() : message;
        io.to(roomId).emit('message:updated', { message: msgObj });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete:me', async (data: { messageId: string; roomId: string }) => {
      try {
        await chatService.deleteForMe(data.messageId, userId);
        io.to(data.roomId).emit('message:deleted:me', {
          messageId: data.messageId,
          roomId: data.roomId,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete:everyone', async (data: { messageId: string }) => {
      try {
        const message = await Message.findById(data.messageId).select('room');
        if (!message) throw new Error('Message not found');
        const roomId = (message.room as any).toString();
        await chatService.deleteForEveryone(data.messageId, userId);
        io.to(roomId).emit('message:deleted:everyone', {
          messageId: data.messageId,
          roomId,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await chatService.addReaction(data.messageId, userId, data.emoji);
        const roomId = (message.room as any).toString();
        const msgObj = message.toObject ? message.toObject() : message;
        io.to(roomId).emit('message:reaction', { message: msgObj });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:react:remove', async (data: { messageId: string }) => {
      try {
        const message = await chatService.removeReaction(data.messageId, userId);
        const roomId = (message.room as any).toString();
        const msgObj = message.toObject ? message.toObject() : message;
        io.to(roomId).emit('message:reaction', { message: msgObj });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('typing:start', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('typing:start', {
        userId,
        username: authSocket.user.username,
        roomId: data.roomId,
      });
    });

    socket.on('typing:stop', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('typing:stop', {
        userId,
        roomId: data.roomId,
      });
    });

    socket.on('messages:read', async (data: { roomId: string }) => {
      try {
        await chatService.markMessagesRead(data.roomId, userId);
        socket.to(data.roomId).emit('messages:read', { userId, roomId: data.roomId });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delivered', async (data: { roomId: string }) => {
      try {
        await chatService.markMessagesDelivered(data.roomId, userId);
        io.to(data.roomId).emit('message:delivered', { roomId: data.roomId, userId });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:join', async (roomId: string) => {
      const isMember = await Room.exists({ _id: roomId, members: userId });
      if (isMember) {
        socket.join(roomId);
        logger.debug('User joined room', { userId, roomId });
      }
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on('disconnect', async (reason) => {
      logger.debug('Socket disconnected', { userId, socketId: socket.id, reason });

      const sockets = await io.in(`user:${userId}`).fetchSockets();
      if (sockets.length === 0) {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit('user:offline', { userId, lastSeen: new Date() });
      }
    });
  });

  setIO(io);
  return io;
}

let _io: Server | null = null;
export function getIO(): Server | null {
  return _io;
}

// Store io reference for use in HTTP controllers
export function setIO(io: Server): void {
  _io = io;
}
