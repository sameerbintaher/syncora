import { create } from 'zustand';
import { Room, Message, TypingUser } from '@/types';

export interface NotificationItem {
  id: string;
  type: 'message';
  roomId: string;
  message: Message;
  mention: boolean;
  createdAt: number;
}

interface ChatStore {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingUser[]>;
  nextCursors: Record<string, string | null>;
  hasMore: Record<string, boolean>;

  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, room: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string | null) => void;
  setUnreadCount: (roomId: string, count: number) => void;

  setMessages: (roomId: string, messages: Message[], nextCursor: string | null, hasMore: boolean) => void;
  prependMessages: (roomId: string, messages: Message[], nextCursor: string | null, hasMore: boolean) => void;
  addMessage: (message: Message) => void;
  addOptimisticMessage: (roomId: string, tempMessage: Partial<Message> & { content: string }) => void;
  replaceOptimisticWithMessage: (roomId: string, message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessageForEveryone: (messageId: string, roomId: string) => void;
  removeMessageForMe: (messageId: string, roomId: string) => void;
  addDeliveredTo: (roomId: string, deliveredByUserId: string, currentUserId: string) => void;

  setTyping: (roomId: string, user: TypingUser) => void;
  clearTyping: (roomId: string, userId: string) => void;

  updateRoomLastMessage: (roomId: string, message: Message) => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;

  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, 'id' | 'createdAt'>) => void;
  clearNotifications: (roomId?: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: {},
  nextCursors: {},
  hasMore: {},

  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms.filter((r) => r._id !== room._id)] })),
  updateRoom: (roomId, updates) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r._id === roomId ? { ...r, ...updates } : r)),
    })),
  removeRoom: (roomId) =>
    set((s) => ({
      rooms: s.rooms.filter((r) => r._id !== roomId),
      messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== roomId)),
    })),
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  setUnreadCount: (roomId, count) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r._id === roomId ? { ...r, unreadCount: count } : r)),
    })),

  setMessages: (roomId, messages, nextCursor, hasMore) =>
    set((s) => ({
      messages: { ...s.messages, [roomId]: messages },
      nextCursors: { ...s.nextCursors, [roomId]: nextCursor },
      hasMore: { ...s.hasMore, [roomId]: hasMore },
    })),

  prependMessages: (roomId, newMessages, nextCursor, hasMore) =>
    set((s) => ({
      messages: { ...s.messages, [roomId]: [...newMessages, ...(s.messages[roomId] || [])] },
      nextCursors: { ...s.nextCursors, [roomId]: nextCursor },
      hasMore: { ...s.hasMore, [roomId]: hasMore },
    })),

  addMessage: (message) =>
    set((s) => {
      const roomId = typeof message.room === 'string' ? message.room : (message.room as any)._id;
      const current = s.messages[roomId] || [];
      if (current.find((m) => m._id === message._id)) return s;
      return { messages: { ...s.messages, [roomId]: [...current, message] } };
    }),

  addOptimisticMessage: (roomId, tempMessage) =>
    set((s) => {
      const current = s.messages[roomId] || [];
      const optimistic = {
        _id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        room: roomId,
        content: tempMessage.content,
        type: (tempMessage.type as 'text') || 'text',
        sender: tempMessage.sender || ({} as any),
        reactions: [],
        readBy: [],
        deliveredTo: [],
        edited: false,
        deleted: false,
        deletedFor: [],
        deletedForEveryone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reply: tempMessage.reply,
        forward: tempMessage.forward,
        mentions: tempMessage.mentions,
      };
      return { messages: { ...s.messages, [roomId]: [...current, optimistic] } };
    }),

  replaceOptimisticWithMessage: (roomId, message) =>
    set((s) => {
      const current = s.messages[roomId] || [];
      const filtered = current.filter((m) => !m._id.startsWith?.('opt-'));
      if (filtered.find((m) => m._id === message._id)) return s;
      return { messages: { ...s.messages, [roomId]: [...filtered, message] } };
    }),

  updateMessage: (message) =>
    set((s) => {
      const roomId = typeof message.room === 'string' ? message.room : (message.room as any)._id;
      const current = s.messages[roomId] || [];
      return {
        messages: {
          ...s.messages,
          [roomId]: current.map((m) => (m._id === message._id ? { ...m, ...message } : m)),
        },
      };
    }),

  removeMessageForEveryone: (messageId, roomId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: true, content: '[Message deleted]' } : m
        ),
      },
    })),

  removeMessageForMe: (messageId, roomId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).filter((m) => m._id !== messageId),
      },
    })),

  addDeliveredTo: (roomId, deliveredByUserId, currentUserId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).map((m) => {
          const senderId = (m.sender as any)?.id ?? (m.sender as any)?._id;
          const isOwn = senderId === currentUserId;
          if (!isOwn || (m.deliveredTo || []).includes(deliveredByUserId)) return m;
          return { ...m, deliveredTo: [...(m.deliveredTo || []), deliveredByUserId] };
        }),
      },
    })),

  setTyping: (roomId, user) =>
    set((s) => {
      const current = (s.typingUsers[roomId] || []).filter((u) => u.userId !== user.userId);
      return { typingUsers: { ...s.typingUsers, [roomId]: [...current, user] } };
    }),

  clearTyping: (roomId, userId) =>
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [roomId]: (s.typingUsers[roomId] || []).filter((u) => u.userId !== userId),
      },
    })),

  updateRoomLastMessage: (roomId, message) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r._id === roomId ? { ...r, lastMessage: message, updatedAt: message.createdAt } : r
      ),
    })),

  updateUserOnlineStatus: (userId, isOnline, lastSeen) =>
    set((s) => ({
      rooms: s.rooms.map((room) => ({
        ...room,
        members: room.members.map((m) =>
          (m.id ?? (m as any)._id) === userId ? { ...m, isOnline, ...(lastSeen && { lastSeen }) } : m
        ),
      })),
    })),

  notifications: [],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: `${n.roomId}-${n.message._id}-${Date.now()}`, createdAt: Date.now() },
        ...s.notifications.slice(0, 49),
      ],
    })),
  clearNotifications: (roomId) =>
    set((s) => ({
      notifications: roomId ? s.notifications.filter((n) => n.roomId !== roomId) : [],
    })),
}));
