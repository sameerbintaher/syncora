'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Room } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useSidebar } from '@/contexts/SidebarContext';
import NotificationDropdown from './NotificationDropdown';

function getOtherMember(room: Room, currentUserId: string) {
  return room.members.find((m) => m.id !== currentUserId && (m as any)._id !== currentUserId);
}

function getRoomDisplayName(room: Room, currentUserId: string): string {
  if (room.type === 'group') return room.name || 'Group';
  return getOtherMember(room, currentUserId)?.username || 'Direct Message';
}

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.NEXT_PUBLIC_API_URL}${avatar}`;
}

export default function ChatHeader({ room, currentUserId }: { room: Room; currentUserId: string }) {
  const displayName = getRoomDisplayName(room, currentUserId);
  const otherUser = getOtherMember(room, currentUserId);
  const { open: openSidebar } = useSidebar();

  const statusText = room.type === 'direct'
    ? otherUser?.isOnline ? 'Online' : otherUser?.lastSeen ? `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}` : 'Offline'
    : `${room.members.length} members`;

  const iconBtn = 'w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200';

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 bg-surface-900/90 backdrop-blur-sm flex-shrink-0">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openSidebar}
        className={`${iconBtn} md:hidden`}
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </motion.button>
      <Link href="/chat" className={`hidden md:flex ${iconBtn}`}>
        <motion.span whileHover={{ x: -2 }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.span>
      </Link>

      {getAvatarUrl(otherUser?.avatar || room.avatar) ? (
        <motion.img
          src={getAvatarUrl(otherUser?.avatar || room.avatar)!}
          alt={displayName}
          className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/5"
          whileHover={{ scale: 1.02 }}
        />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 text-sm font-medium">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-white truncate">{displayName}</h2>
        <p className={`text-xs truncate flex items-center gap-1.5 ${otherUser?.isOnline ? 'text-accent-emerald' : 'text-slate-500'}`}>
          {otherUser?.isOnline && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
          )}
          {statusText}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <NotificationDropdown />
        {otherUser && (
          <Link href={`/chat/profile/${otherUser.id || (otherUser as any)._id}`} className={iconBtn} title="Profile">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        )}
        {room.type === 'group' && (
          <Link href={`/chat/${room._id}/info`} className={iconBtn} title="Group info">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
        )}
      </div>
    </header>
  );
}
