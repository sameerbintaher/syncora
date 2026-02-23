export interface User {
  id?: string;
  _id?: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface Room {
  _id: string;
  name?: string;
  type: 'direct' | 'group';
  members: User[];
  admins?: (string | { _id?: string; username?: string })[];
  description?: string;
  avatar?: string;
  lastMessage?: Message;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Reply {
  messageId: string;
  content: string;
  senderUsername: string;
}

export interface Forward {
  originalMessageId: string;
  originalSenderId: string;
}

export interface Mention {
  userId: string;
  username: string;
}

export interface Message {
  _id: string;
  room: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'emoji';
  reactions: Reaction[];
  readBy: string[];
  deliveredTo: string[];
  edited: boolean;
  editedAt?: string;
  deleted: boolean;
  deletedFor: string[];
  deletedForEveryone: boolean;
  reply?: Reply;
  forward?: Forward;
  mentions?: Mention[];
  createdAt: string;
  updatedAt: string;
}

export interface TypingUser {
  userId: string;
  username: string;
  roomId: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';
