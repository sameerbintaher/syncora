import path from 'path';
import fs from 'fs';
import { User, IUserDocument, PublicUser } from '../models/User';
import { AppError } from '../utils/AppError';

export class UserService {
  async getProfile(userId: string): Promise<PublicUser> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicJSON();
  }

  async updateProfile(userId: string, updates: { username?: string; bio?: string }): Promise<PublicUser> {
    if (updates.username) {
      const existing = await User.findOne({ username: updates.username, _id: { $ne: userId } });
      if (existing) throw new AppError('Username already taken', 409);
    }
    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicJSON();
  }

  async updateAvatar(userId: string, filename: string): Promise<PublicUser> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.avatar && !user.avatar.startsWith('http')) {
      const oldPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    user.avatar = `/uploads/avatars/${filename}`;
    await user.save();
    return user.toPublicJSON();
  }

  async searchUsers(query: string, currentUserId: string): Promise<PublicUser[]> {
    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    const blockedIds = currentUser?.blockedUsers || [];
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: currentUserId, $nin: blockedIds },
    })
      .select('username email avatar isOnline lastSeen bio')
      .limit(20)
      .lean();

    return users.map((u: any) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      bio: u.bio,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
      createdAt: u.createdAt,
    }));
  }

  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    if (currentUserId === targetUserId) throw new AppError('Cannot block yourself', 400);
    const target = await User.findById(targetUserId);
    if (!target) throw new AppError('User not found', 404);
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { blockedUsers: targetUserId } });
  }

  async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
    await User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: targetUserId } });
  }

  async getBlockedUsers(userId: string): Promise<PublicUser[]> {
    const user = await User.findById(userId).populate('blockedUsers', 'username email avatar isOnline lastSeen');
    if (!user) throw new AppError('User not found', 404);
    return ((user.blockedUsers as any) || []).map((u: any) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
      createdAt: u.createdAt,
    }));
  }

  async getUserById(userId: string, currentUserId: string): Promise<PublicUser> {
    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    const blockedIds = currentUser?.blockedUsers || [];
    const isBlocked = blockedIds.some((id: any) => id.toString() === userId);
    if (isBlocked) throw new AppError('User not found', 404);
    const user = await User.findById(userId).select('-refreshTokens -password -blockedUsers');
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicJSON();
  }
}

export const userService = new UserService();
