'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import { Room } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import NewRoomModal from '@/components/chat/NewRoomModal';
import clsx from 'clsx';

function getRoomDisplayName(room: Room, currentUserId: string): string {
  if (room.type === 'group') return room.name || 'Group';
  const other = room.members.find((m) => m.id !== currentUserId && (m as any)._id !== currentUserId);
  return other?.username || 'Direct Message';
}

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.NEXT_PUBLIC_API_URL}${avatar}`;
}

function getRoomAvatar(room: Room, currentUserId: string): string {
  if (room.type === 'direct') {
    const other = room.members.find((m) => m.id !== currentUserId && (m as any)._id !== currentUserId);
    return getAvatarUrl(other?.avatar);
  }
  return getAvatarUrl(room.avatar);
}

function isOtherUserOnline(room: Room, currentUserId: string): boolean {
  if (room.type !== 'direct') return false;
  const other = room.members.find((m) => m.id !== currentUserId && (m as any)._id !== currentUserId);
  return other?.isOnline || false;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { rooms, setRooms } = useChatStore();
  const { isOpen, close, isDesktop } = useSidebar();
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/rooms').then(({ data }) => {
      setRooms(data.data.rooms);
      setIsLoading(false);
    });
  }, [setRooms]);

  const currentUserId = (user?.id ?? user?._id) || '';

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        transition={{ duration: 0.2 }}
        onClick={close}
        aria-hidden="true"
      />

      <motion.aside
        className={clsx(
          'flex flex-col h-full flex-shrink-0 bg-surface-900/95 border-r border-slate-800/60',
          'md:relative md:translate-x-0 md:w-72 md:min-w-[260px]',
          'fixed inset-y-0 left-0 z-50 w-[min(320px,85vw)] backdrop-blur-sm'
        )}
        initial={false}
        animate={{ x: isDesktop ? 0 : isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/60">
          <Link href="/chat" onClick={close} className="group">
            <span className="text-lg font-bold text-white tracking-tight">
              Sync<span className="text-primary-400 group-hover:text-primary-300 transition-colors">ora</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowNewRoom(true); close(); }}
              className="w-9 h-9 rounded-xl bg-primary-600/20 hover:bg-primary-500/30 flex items-center justify-center text-primary-400 hover:text-primary-300 transition-colors"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={close}
              className="w-9 h-9 rounded-xl hover:bg-slate-800/60 flex items-center justify-center text-slate-400 md:hidden"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Rooms list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <motion.div
                className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-400 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-slate-500 text-sm">Loading conversations...</p>
            </motion.div>
          ) : rooms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 px-4"
            >
              <motion.div
                className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </motion.div>
              <p className="text-slate-400 text-sm mb-4">No conversations yet</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowNewRoom(true)}
                className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
              >
                Start a chat
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {rooms.map((room, i) => {
                  const displayName = getRoomDisplayName(room, currentUserId);
                  const isActive = pathname.startsWith(`/chat/${room._id}`);
                  const avatarUrl = getRoomAvatar(room, currentUserId);
                  const online = isOtherUserOnline(room, currentUserId);
                  const lastMsg = room.lastMessage;

                  return (
                    <motion.div
                      key={room._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      layout
                    >
                      <Link
                        href={`/chat/${room._id}`}
                        onClick={close}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                          isActive
                            ? 'bg-primary-600/15 text-white border border-primary-500/20'
                            : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                        )}
                      >
                        <motion.div
                          className="relative flex-shrink-0"
                          whileHover={{ scale: 1.05 }}
                        >
                          {(room.unreadCount ?? 0) > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold bg-primary-500 text-white rounded-full"
                            >
                              {(room.unreadCount ?? 0) > 99 ? '99' : room.unreadCount}
                            </motion.span>
                          )}
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/5" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 text-sm font-medium ring-1 ring-white/5">
                              {displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {online && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute bottom-0 right-0 w-3 h-3 bg-accent-emerald rounded-full border-2 border-surface-900"
                            />
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{displayName}</span>
                            {lastMsg && (
                              <span className="text-[11px] text-slate-500 flex-shrink-0">
                                {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <p className="text-xs text-slate-500 truncate mt-0.5 group-hover:text-slate-400 transition-colors">
                              {lastMsg.deletedForEveryone ? '[Deleted]' : lastMsg.content}
                            </p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-800/60">
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors">
            <Link href="/chat/profile" onClick={close} className="flex items-center gap-3 flex-1 min-w-0">
              {getAvatarUrl(user?.avatar) ? (
                <img src={getAvatarUrl(user?.avatar)} alt={user?.username} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/5" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 text-sm font-medium">
                  {user?.username?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.username}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-accent-emerald"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  Online
                </p>
              </div>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.aside>

      <AnimatePresence>
        {showNewRoom && <NewRoomModal key="new-room" onClose={() => setShowNewRoom(false)} />}
      </AnimatePresence>
    </>
  );
}
