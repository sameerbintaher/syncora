'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.NEXT_PUBLIC_API_URL}${avatar}`;
}

function getRoomDisplayName(room: any, currentUserId: string): string {
  if (!room) return 'Chat';
  if (room.type === 'group') return room.name || 'Group';
  const other = room.members?.find((m: any) => (m.id ?? m._id) !== currentUserId);
  return other?.username || 'Direct Message';
}

export default function NotificationDropdown() {
  const { notifications, rooms, clearNotifications, setUnreadCount } = useChatStore();
  const currentUserId = (useAuthStore((s) => s.user)?.id ?? (useAuthStore((s) => s.user) as any)?._id) || '';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadTotal = rooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
  const unreadRooms = rooms
    .filter((r) => (r.unreadCount ?? 0) > 0)
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  // Merge: prefer real-time notifications for rooms that have both, then fill with unread rooms
  const seenRoomIds = new Set<string>();
  const items: { roomId: string; room: any; message: any; isNotification: boolean }[] = [];
  notifications.forEach((n) => {
    if (!seenRoomIds.has(n.roomId)) {
      seenRoomIds.add(n.roomId);
      const room = rooms.find((r) => r._id === n.roomId);
      items.push({ roomId: n.roomId, room, message: n.message, isNotification: true });
    }
  });
  unreadRooms.forEach((room) => {
    if (!seenRoomIds.has(room._id)) {
      seenRoomIds.add(room._id);
      items.push({
        roomId: room._id,
        room,
        message: room.lastMessage,
        isNotification: false,
      });
    }
  });
  items.sort((a, b) => {
    const aTime = a.message?.createdAt ? new Date(a.message.createdAt).getTime() : 0;
    const bTime = b.message?.createdAt ? new Date(b.message.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const clearAllUnread = () => {
    unreadRooms.forEach((r) => setUnreadCount(r._id, 0));
    clearNotifications();
  };

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((p) => !p)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <AnimatePresence>
          {unreadTotal > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold bg-primary-500 text-white rounded-full"
            >
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-slate-800/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="px-3 py-2.5 border-b border-slate-700/60 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {items.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearAllUnread}
                  className="text-xs text-slate-400 hover:text-primary-400 transition-colors"
                >
                  Clear all
                </motion.button>
              )}
            </div>
            <div className="overflow-y-auto max-h-96">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-slate-500 text-sm text-center">No new notifications</p>
              ) : (
                items.map(({ roomId, room, message, isNotification }, i) => {
                  const roomName = getRoomDisplayName(room, currentUserId);
                  const sender = message?.sender;
                  const avatar = room?.avatar || sender?.avatar;
                  const initials = (sender?.username || roomName || '?').slice(0, 2).toUpperCase();
                  const preview = message?.deletedForEveryone
                    ? '[Message deleted]'
                    : message?.content
                      ? message.content
                      : message?.type === 'image'
                        ? '📷 Photo'
                        : message?.type === 'file'
                          ? '📎 File'
                          : 'No messages yet';
                  return (
                    <motion.div
                      key={roomId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        href={`/chat/${roomId}`}
                        onClick={() => {
                          setOpen(false);
                          if (isNotification) clearNotifications(roomId);
                          setUnreadCount(roomId, 0);
                        }}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0 group"
                      >
                        {getAvatarUrl(avatar) ? (
                          <img src={getAvatarUrl(avatar)} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600/30 to-slate-600 flex items-center justify-center text-slate-300 text-xs font-medium flex-shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">
                            {sender ? (
                              <>
                                <span className="font-medium">{sender.username}</span>
                                <span className="text-slate-500"> in </span>
                              </>
                            ) : null}
                            <span>{roomName}</span>
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{preview}</p>
                        </div>
                        {(room?.unreadCount ?? 0) > 0 && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold bg-primary-500 text-white rounded-full">
                            {(room?.unreadCount ?? 0) > 99 ? '99+' : room?.unreadCount}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
