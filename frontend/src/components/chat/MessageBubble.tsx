'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Message } from '@/types';
import { format } from 'date-fns';
import clsx from 'clsx';
import { getSocket } from '@/lib/socket';

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isLast: boolean;
  currentUserId: string;
  onReply: () => void;
  onForward?: (message: Message) => void;
}

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.NEXT_PUBLIC_API_URL}${avatar}`;
}

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

function getDeliveryIcon(message: Message, isOwn: boolean, currentUserId: string) {
  if (!isOwn) return null;
  if (message.readBy && message.readBy.some((id) => id !== currentUserId)) {
    return <span className="text-primary-400 text-xs">✓✓</span>;
  }
  if (message.deliveredTo && message.deliveredTo.some((id) => id !== currentUserId)) {
    return <span className="text-slate-400 text-xs">✓✓</span>;
  }
  return <span className="text-slate-500 text-xs">✓</span>;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ message, isOwn, showAvatar, isLast, currentUserId, onReply, onForward }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-lg">{message.content}</span>
      </div>
    );
  }

  const isDeleted = message.deletedForEveryone;
  const roomId = typeof message.room === 'string' ? message.room : (message.room as any)._id;

  const handleDeleteForMe = () => {
    getSocket().emit('message:delete:me', { messageId: message._id, roomId });
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleDeleteForEveryone = () => {
    getSocket().emit('message:delete:everyone', { messageId: message._id });
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleEdit = () => {
    if (!editContent.trim()) return;
    getSocket().emit('message:edit', { messageId: message._id, content: editContent });
    setIsEditing(false);
  };

  const handleReact = (emoji: string) => {
    getSocket().emit('message:react', { messageId: message._id, emoji });
    setShowEmojiPicker(false);
  };

  const handleForward = () => {
    setShowMoreMenu(false);
    setShowActions(false);
    onForward?.(message);
  };

  const handleEditClick = () => {
    setShowMoreMenu(false);
    setShowActions(false);
    setIsEditing(true);
  };

  const reactionGroups = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const myReaction = message.reactions?.find((r) => r.userId === currentUserId)?.emoji;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx('group flex items-end gap-2 px-1 py-0.5', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!showMoreMenu) { setShowActions(false); setShowEmojiPicker(false); } }}
    >
      <div className={clsx('w-7 h-7 flex-shrink-0', !showAvatar && 'invisible')}>
        {getAvatarUrl(message.sender.avatar) ? (
          <img src={getAvatarUrl(message.sender.avatar)} alt={message.sender.username} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-medium">
            {message.sender.username.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className={clsx('max-w-[75%] sm:max-w-[70%] flex flex-col gap-0.5', isOwn && 'items-end')}>
        {showAvatar && !isOwn && (
          <span className="text-xs text-slate-500 px-1">{message.sender.username}</span>
        )}

        {message.reply && !isDeleted && (
          <div className="text-xs px-2.5 py-1 rounded-lg border-l-2 border-primary-500 bg-slate-800/50 mb-0.5">
            <p className="text-primary-400 font-medium">{message.reply.senderUsername}</p>
            <p className="text-slate-400 truncate max-w-[200px]">{message.reply.content}</p>
          </div>
        )}

        {message.forward && !isDeleted && (
          <div className="text-xs text-slate-500 italic px-1 flex items-center gap-1">
            <span>↗</span> Forwarded
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-1.5 w-full">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm resize-none outline-none border border-primary-500/50 min-w-40"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleEdit} className="text-xs text-primary-400 font-medium">Save</button>
            </div>
          </div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={clsx(
              'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words transition-shadow',
              isOwn ? 'bg-primary-600 text-white rounded-br-md shadow-lg shadow-primary-600/20' : 'bg-slate-800/80 text-slate-100 rounded-bl-md shadow-md',
              isDeleted && 'opacity-50 italic',
              isLast && isOwn && 'rounded-br-2xl',
              isLast && !isOwn && 'rounded-bl-2xl'
            )}
          >
            {message.mentions?.length
              ? (() => {
                  const mentions = message.mentions || [];
                  const usernames = mentions.map((m) => m.username);
                  const parts = message.content.split(/(@\w+)/g);
                  return (
                    <>
                      {parts.map((p, i) =>
                        p.startsWith('@') && usernames.includes(p.slice(1)) ? (
                          <span key={i} className="text-primary-400 font-medium">{p}</span>
                        ) : (
                          <span key={i}>{p}</span>
                        )
                      )}
                    </>
                  );
                })()
              : message.content}
          </motion.div>
        )}

        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => myReaction === emoji ? getSocket().emit('message:react:remove', { messageId: message._id }) : handleReact(emoji)}
                className={clsx(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
                  myReaction === emoji ? 'bg-primary-600/30 border-primary-500/40' : 'bg-slate-800 border-slate-600 text-slate-300'
                )}
              >
                <span>{emoji}</span>
                {count > 1 && <span>{count}</span>}
              </button>
            ))}
          </div>
        )}

        <div className={clsx('flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150', isOwn ? 'flex-row-reverse' : '')}>
          <span className="text-xs text-slate-500">{formatTime(message.createdAt)}</span>
          {message.edited && <span className="text-xs text-slate-500">(edited)</span>}
          {getDeliveryIcon(message, isOwn, currentUserId)}
        </div>
      </div>

      {showActions && !isDeleted && !isEditing && (
        <div className={clsx('flex items-center gap-1 transition-opacity duration-150', showMoreMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100', isOwn ? 'flex-row-reverse' : '')}>
          <div className="relative">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => setShowEmojiPicker((p) => !p)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white text-sm transition-colors">
              😊
            </motion.button>
            {showEmojiPicker && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={clsx('absolute bottom-9 z-50 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl p-2 flex gap-2 shadow-xl', isOwn ? 'right-0' : 'left-0')}>
                {COMMON_EMOJIS.map((e) => (
                  <motion.button key={e} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => handleReact(e)} className="text-lg p-0.5">
                    {e}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>

          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={onReply} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title="Reply">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </motion.button>

          <div className="relative" ref={moreMenuRef}>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={(e) => { e.stopPropagation(); setShowMoreMenu((p) => !p); setShowEmojiPicker(false); }}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="More options"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </motion.button>
            {showMoreMenu && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={clsx('absolute z-50 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl py-1 min-w-44', isOwn ? 'right-0 bottom-10' : 'left-0 bottom-10')}>
                {isOwn && (
                  <button onClick={handleEditClick} className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 rounded-t-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit
                  </button>
                )}
                <button onClick={handleDeleteForMe} className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete for me
                </button>
                {isOwn && (
                  <button onClick={handleDeleteForEveryone} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete for everyone
                  </button>
                )}
                <button onClick={handleForward} className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 rounded-b-lg">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  Forward
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
