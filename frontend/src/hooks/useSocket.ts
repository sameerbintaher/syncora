'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { Message } from '@/types';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export function useSocket() {
  const { isAuthenticated } = useAuthStore();
  const {
    addMessage, updateMessage, removeMessageForEveryone, removeMessageForMe,
    addDeliveredTo, setTyping, clearTyping, updateUserOnlineStatus, updateRoomLastMessage,
    updateRoom, removeRoom, setUnreadCount, addNotification,
  } = useChatStore();
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const currentUserId = useAuthStore((s) => s.user?.id ?? (s.user as any)?._id);
  const rooms = useChatStore((s) => s.rooms);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on('message:new', ({ message }: { message: Message }) => {
      const roomId = typeof message.room === 'string' ? message.room : (message.room as any)._id;
      const senderId = (message.sender as any)?.id ?? (message.sender as any)?._id;
      const uid = useAuthStore.getState().user?.id ?? (useAuthStore.getState().user as any)?._id;
      if (senderId === uid) {
        useChatStore.getState().replaceOptimisticWithMessage(roomId, message);
      } else {
        addMessage(message);
      }
      updateRoomLastMessage(roomId, message);
      const state = useChatStore.getState();
      const active = state.activeRoomId;
      if (senderId !== uid) {
        if (active === roomId) {
          getSocket().emit('message:delivered', { roomId });
        } else {
          const room = state.rooms.find((r) => r._id === roomId);
          setUnreadCount(roomId, (room?.unreadCount ?? 0) + 1);
          addNotification({ type: 'message', roomId, message, mention: false });
          playNotificationSound();
        }
      }
    });

    socket.on('room:updated', ({ room }: { room: any }) => {
      if (room?._id) updateRoom(room._id, room);
    });

    socket.on('room:left', ({ roomId }: { roomId: string }) => {
      removeRoom(roomId);
    });

    socket.on('message:updated', ({ message }: { message: Message }) => {
      updateMessage(message);
    });

    socket.on('message:reaction', ({ message }: { message: Message }) => {
      updateMessage(message);
    });

    socket.on('message:deleted:everyone', ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      removeMessageForEveryone(messageId, roomId);
    });

    socket.on('message:deleted:me', ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      removeMessageForMe(messageId, roomId);
    });

    socket.on('messages:read', ({ userId, roomId }: { userId: string; roomId: string }) => {
      const { messages } = useChatStore.getState();
      const roomMessages = messages[roomId] || [];
      roomMessages.forEach((m) => {
        if (!(m.readBy || []).includes(userId)) {
          updateMessage({ ...m, readBy: [...(m.readBy || []), userId] });
        }
      });
    });

    socket.on('message:delivered', ({ roomId, userId }: { roomId: string; userId: string }) => {
      if (currentUserId) addDeliveredTo(roomId, userId, currentUserId);
    });

    socket.on('typing:start', (data: { userId: string; username: string; roomId: string }) => {
      setTyping(data.roomId, data);
    });

    socket.on('typing:stop', (data: { userId: string; roomId: string }) => {
      clearTyping(data.roomId, data.userId);
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      updateUserOnlineStatus(userId, true);
    });

    socket.on('user:offline', ({ userId, lastSeen }: { userId: string; lastSeen: string }) => {
      updateUserOnlineStatus(userId, false, lastSeen);
    });

    return () => {
      ['message:new','message:updated','message:reaction','message:deleted:everyone',
       'message:deleted:me','messages:read','message:delivered','typing:start','typing:stop',
       'user:online','user:offline','room:updated','room:left'].forEach((e) => socket.off(e));
      initialized.current = false;
    };
  }, [isAuthenticated, addMessage, updateMessage, removeMessageForEveryone,
      removeMessageForMe, addDeliveredTo, setTyping, clearTyping, updateUserOnlineStatus,
      updateRoomLastMessage, updateRoom, removeRoom, setUnreadCount, addNotification]);
}
