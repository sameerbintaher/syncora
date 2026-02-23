import mongoose from 'mongoose';
import { Room, IRoomDocument } from '../models/Room';
import { Message, IMessageDocument } from '../models/Message';
import { User } from '../models/User';
import { RoomReadStatus } from '../models/RoomReadStatus';
import { AppError } from '../utils/AppError';
import { sanitizeMessage, sanitizeForDisplay } from '../utils/sanitize';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class ChatService {
  async createRoom(
    creatorId: string,
    type: 'direct' | 'group',
    memberIds: string[],
    name?: string,
    description?: string
  ): Promise<IRoomDocument> {
    const allMembers = [...new Set([creatorId, ...memberIds])];

    if (type === 'direct') {
      if (allMembers.length !== 2)
        throw new AppError('Direct rooms require exactly 2 members', 400);

      const existing = await Room.findOne({
        type: 'direct',
        members: { $all: allMembers, $size: 2 },
      });
      if (existing) return existing;
    }

    if (type === 'group' && !name)
      throw new AppError('Group rooms require a name', 400);

    const users = await User.find({ _id: { $in: allMembers } });
    if (users.length !== allMembers.length)
      throw new AppError('One or more users not found', 404);

    const creatorObjId = new mongoose.Types.ObjectId(creatorId);
    return Room.create({
      name,
      type,
      members: allMembers.map((id) => new mongoose.Types.ObjectId(id)),
      admins: [creatorObjId],
      groupName: type === 'group' ? name : undefined,
      groupAdmin: type === 'group' ? creatorObjId : undefined,
      description,
      createdBy: creatorObjId,
    });
  }

  async getUserRooms(userId: string): Promise<any[]> {
    const rooms = await Room.find({ members: userId })
      .populate('members', 'username avatar isOnline lastSeen')
      .populate('admins', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    const roomIds = rooms.map((r) => (r as any)._id.toString());
    const readStatuses = await RoomReadStatus.find({ userId, roomId: { $in: roomIds } }).lean();
    const lastReadMap = new Map<string, Date>();
    readStatuses.forEach((rs: any) => lastReadMap.set(rs.roomId.toString(), rs.lastReadAt));

    const unreadCounts = await Promise.all(
      roomIds.map(async (roomId) => {
        const lastRead = lastReadMap.get(roomId);
        const query: any = { room: roomId, sender: { $ne: userId } };
        if (lastRead) query.createdAt = { $gt: lastRead };
        return Message.countDocuments(query);
      })
    );

    return rooms.map((r, i) => ({
      ...r,
      unreadCount: unreadCounts[i],
    }));
  }

  async getRoomById(roomId: string, userId: string): Promise<IRoomDocument> {
    const room = await Room.findOne({ _id: roomId, members: userId })
      .populate('members', 'username avatar isOnline lastSeen')
      .populate('admins', 'username');

    if (!room) throw new AppError('Room not found', 404);
    return room as IRoomDocument;
  }

  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' | 'emoji' = 'text',
    options?: {
      reply?: { messageId: string; content: string; senderUsername: string };
      forward?: { originalMessageId: string; originalSenderId: string };
      mentions?: { userId: string; username: string }[];
    }
  ): Promise<IMessageDocument> {
    const room = await Room.findOne({ _id: roomId, members: senderId });
    if (!room) throw new AppError('Room not found or access denied', 403);

    const sanitizedContent = type === 'text' ? sanitizeMessage(content) : content;
    const doc: any = {
      room: roomId,
      sender: senderId,
      content: sanitizedContent,
      type,
      readBy: [senderId],
      deliveredTo: [],
      reactions: [],
      deletedFor: [],
      deletedForEveryone: false,
    };

    if (options?.mentions?.length) {
      doc.mentions = options.mentions;
    }

    if (options?.reply) {
      doc.reply = {
        messageId: options.reply.messageId,
        content: sanitizeForDisplay(options.reply.content),
        senderUsername: sanitizeForDisplay(options.reply.senderUsername),
      };
    }

    if (options?.forward) {
      doc.forward = {
        originalMessageId: options.forward.originalMessageId,
        originalSenderId: options.forward.originalSenderId,
      };
    }

    const message = await Message.create(doc);

    await Room.findByIdAndUpdate(roomId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    return message.populate('sender', 'username avatar');
  }

  async getRoomMessages(
    roomId: string,
    userId: string,
    cursor?: string,
    limit = DEFAULT_LIMIT
  ): Promise<{
    messages: any[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const room = await Room.findOne({ _id: roomId, members: userId });
    if (!room) throw new AppError('Room not found or access denied', 403);

    const actualLimit = Math.min(limit, MAX_LIMIT);
    const query: any = {
      room: roomId,
      $and: [
        { $or: [{ deletedForEveryone: { $ne: true } }, { deletedForEveryone: { $exists: false } }] },
        { deleted: { $ne: true } },
        { $or: [{ deletedFor: { $ne: userId } }, { deletedFor: { $exists: false } }] },
      ],
    };

    let sortOrder: any = { createdAt: -1 };
    if (cursor) {
      const cursorDoc = await Message.findById(cursor);
      if (cursorDoc) {
        query.createdAt = { $lt: cursorDoc.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('sender', 'username avatar')
      .sort(sortOrder)
      .limit(actualLimit + 1)
      .lean();

    const hasMore = messages.length > actualLimit;
    const resultMessages = hasMore ? messages.slice(0, actualLimit) : messages;
    const nextCursor = hasMore ? (resultMessages[resultMessages.length - 1] as any)._id.toString() : null;

    return {
      messages: resultMessages.reverse(),
      nextCursor,
      hasMore,
    };
  }

  async markMessagesRead(roomId: string, userId: string): Promise<void> {
    const now = new Date();
    await Message.updateMany(
      { room: roomId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    await RoomReadStatus.findOneAndUpdate(
      { userId, roomId },
      { lastReadAt: now },
      { upsert: true }
    );
  }

  async markMessagesDelivered(roomId: string, userId: string): Promise<void> {
    await Message.updateMany(
      { room: roomId, deliveredTo: { $ne: userId } },
      { $addToSet: { deliveredTo: userId } }
    );
  }

  async deleteForMe(messageId: string, userId: string): Promise<void> {
    const message = await Message.findOne({ _id: messageId });
    if (!message) throw new AppError('Message not found', 404);

    const room = await Room.findOne({ _id: message.room, members: userId });
    if (!room) throw new AppError('Access denied', 403);

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: userId },
    });
  }

  async deleteForEveryone(messageId: string, userId: string): Promise<void> {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new AppError('Message not found or access denied', 403);

    message.deleted = true;
    message.deletedForEveryone = true;
    message.content = '[Message deleted]';
    await message.save();
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<IMessageDocument> {
    const message = await Message.findOne({ _id: messageId });
    if (!message) throw new AppError('Message not found', 404);

    const room = await Room.findOne({ _id: message.room, members: userId });
    if (!room) throw new AppError('Access denied', 403);

    const existing = message.reactions?.find(
      (r: any) => r.userId.toString() === userId
    );
    if (existing) {
      (existing as any).emoji = emoji;
    } else {
      message.reactions = message.reactions || [];
      message.reactions.push({ emoji, userId: userId as any });
    }
    await message.save();
    return message.populate('sender', 'username avatar');
  }

  async removeReaction(messageId: string, userId: string): Promise<IMessageDocument> {
    const message = await Message.findOne({ _id: messageId });
    if (!message) throw new AppError('Message not found', 404);

    const room = await Room.findOne({ _id: message.room, members: userId });
    if (!room) throw new AppError('Access denied', 403);

    message.reactions = (message.reactions || []).filter(
      (r: any) => r.userId.toString() !== userId
    );
    await message.save();
    return message.populate('sender', 'username avatar');
  }

  async editMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<IMessageDocument> {
    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      deletedForEveryone: false,
    });
    if (!message) throw new AppError('Message not found or access denied', 403);

    message.content = sanitizeMessage(content);
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    return message.populate('sender', 'username avatar');
  }

  async forwardMessage(
    messageId: string,
    senderId: string,
    targetRoomId: string
  ): Promise<IMessageDocument> {
    const original = await Message.findOne({ _id: messageId })
      .populate('sender', 'username')
      .lean();
    if (!original) throw new AppError('Message not found', 404);

    const room = await Room.findOne({ _id: targetRoomId, members: senderId });
    if (!room) throw new AppError('Room not found or access denied', 403);

    return this.saveMessage(
      targetRoomId,
      senderId,
      (original as any).content,
      (original as any).type,
      {
        forward: {
          originalMessageId: messageId,
          originalSenderId: (original as any).sender._id.toString(),
        },
      }
    );
  }

  async addMembers(roomId: string, userId: string, memberIds: string[]): Promise<IRoomDocument> {
    const room = await Room.findOne({ _id: roomId, members: userId });
    if (!room) throw new AppError('Room not found', 404);
    if (room.type !== 'group') throw new AppError('Only group rooms support adding members', 400);
    const admins = (room.admins || []).map((a: any) => a.toString());
    if (!admins.includes(userId)) throw new AppError('Admin access required', 403);

    const users = await User.find({ _id: { $in: memberIds } });
    if (users.length !== memberIds.length) throw new AppError('One or more users not found', 404);

    const existingIds = new Set(room.members.map((m: any) => m.toString()));
    const toAdd = memberIds.filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) return this.getRoomById(roomId, userId);

    await Room.findByIdAndUpdate(roomId, {
      $addToSet: { members: { $each: toAdd.map((id) => new mongoose.Types.ObjectId(id)) } },
      updatedAt: new Date(),
    });
    return this.getRoomById(roomId, userId);
  }

  async removeMember(roomId: string, actorId: string, targetUserId: string): Promise<IRoomDocument | null> {
    const room = await Room.findOne({ _id: roomId });
    if (!room) throw new AppError('Room not found', 404);
    if (room.type !== 'group') throw new AppError('Only group rooms support removing members', 400);
    const admins = (room.admins || []).map((a: any) => a.toString());
    const isAdmin = admins.includes(actorId);
    const isSelf = actorId === targetUserId;
    if (!isAdmin && !isSelf) throw new AppError('Admin access required to remove others', 403);

    const memberIds = room.members.map((m: any) => m.toString());
    if (!memberIds.includes(targetUserId)) throw new AppError('User is not a member', 404);

    await Room.findByIdAndUpdate(roomId, {
      $pull: { members: targetUserId, admins: targetUserId },
      updatedAt: new Date(),
    });

    if (actorId === targetUserId) {
      await RoomReadStatus.deleteOne({ userId: targetUserId, roomId });
      return null;
    }
    return this.getRoomById(roomId, actorId);
  }

  async promoteAdmin(roomId: string, userId: string, targetUserId: string): Promise<IRoomDocument> {
    const room = await Room.findOne({ _id: roomId, admins: userId });
    if (!room) throw new AppError('Room not found or admin access required', 403);
    if (room.type !== 'group') throw new AppError('Only group rooms have admins', 400);
    const isMember = room.members.some((m: any) => m.toString() === targetUserId);
    if (!isMember) throw new AppError('User is not a member', 404);

    await Room.findByIdAndUpdate(roomId, { $addToSet: { admins: targetUserId }, updatedAt: new Date() });
    return this.getRoomById(roomId, userId);
  }

  async demoteAdmin(roomId: string, userId: string, targetUserId: string): Promise<IRoomDocument> {
    const room = await Room.findOne({ _id: roomId, admins: userId });
    if (!room) throw new AppError('Room not found or admin access required', 403);
    if (room.type !== 'group') throw new AppError('Only group rooms have admins', 400);
    const admins = (room.admins || []).map((a: any) => a.toString());
    if (admins.length <= 1 && admins.includes(targetUserId))
      throw new AppError('Cannot remove the last admin', 400);

    await Room.findByIdAndUpdate(roomId, { $pull: { admins: targetUserId }, updatedAt: new Date() });
    return this.getRoomById(roomId, userId);
  }

  async updateGroupName(roomId: string, userId: string, name: string): Promise<IRoomDocument> {
    const room = await Room.findOne({ _id: roomId, admins: userId });
    if (!room) throw new AppError('Room not found or admin access required', 403);
    if (room.type !== 'group') throw new AppError('Only group rooms have names', 400);
    if (!name?.trim()) throw new AppError('Group name is required', 400);

    await Room.findByIdAndUpdate(roomId, { name: name.trim(), updatedAt: new Date() });
    return this.getRoomById(roomId, userId);
  }

  async updateGroupAvatar(roomId: string, userId: string, avatarPath: string): Promise<IRoomDocument> {
    const room = await Room.findOne({ _id: roomId, admins: userId });
    if (!room) throw new AppError('Room not found or admin access required', 403);
    if (room.type !== 'group') throw new AppError('Only group rooms have avatars', 400);

    await Room.findByIdAndUpdate(roomId, { avatar: avatarPath, updatedAt: new Date() });
    return this.getRoomById(roomId, userId);
  }

  async leaveGroup(roomId: string, userId: string): Promise<void> {
    await this.removeMember(roomId, userId, userId);
  }
}

export const chatService = new ChatService();
