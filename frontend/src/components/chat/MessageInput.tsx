'use client';

import { useState, KeyboardEvent, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { Message, Room } from '@/types';
import clsx from 'clsx';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface Props {
  roomId: string;
  room?: Room;
  currentUserId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string, type?: 'text' | 'emoji', mentions?: { userId: string; username: string }[]) => void;
}

export default function MessageInput({ roomId, room, currentUserId, replyTo, onCancelReply, onSend }: Props) {
  const [value, setValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentions, setMentions] = useState<{ userId: string; username: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionCursor, setMentionCursor] = useState(0);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const isTyping = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const members = room?.members || [];
  const others = members.filter((m) => ((m as any).id ?? (m as any)._id) !== currentUserId);
  const mentionMatches = others.filter(
    (m) => !mentionQuery || ((m as any).username || '').toLowerCase().startsWith(mentionQuery.toLowerCase())
  ).slice(0, 5);

  const emitTypingStart = useCallback(() => {
    if (!isTyping.current) { isTyping.current = true; getSocket().emit('typing:start', { roomId }); }
  }, [roomId]);

  const emitTypingStop = useCallback(() => {
    if (isTyping.current) { isTyping.current = false; getSocket().emit('typing:stop', { roomId }); }
  }, [roomId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    const pos = e.target.selectionStart || 0;
    const beforeCursor = v.slice(0, pos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentionPicker(true);
      setMentionCursor(0);
    } else {
      setShowMentionPicker(false);
    }
    emitTypingStart();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(emitTypingStop, 2000);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`;
  };

  const insertMention = (username: string, userId: string) => {
    const pos = textareaRef.current?.selectionStart || value.length;
    const beforeCursor = value.slice(0, pos);
    const atStart = beforeCursor.lastIndexOf('@');
    const newVal = value.slice(0, atStart) + `@${username} ` + value.slice(pos);
    setValue(newVal);
    setMentions((prev) => (prev.some((m) => m.userId === userId) ? prev : [...prev, { userId, username }]));
    setShowMentionPicker(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed, 'text', mentions.length ? mentions : undefined);
    setValue('');
    setMentions([]);
    emitTypingStop();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPicker && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape')) {
      if (e.key === 'Escape') setShowMentionPicker(false);
      else if (e.key === 'Enter' && mentionMatches[mentionCursor]) {
        e.preventDefault();
        const m = mentionMatches[mentionCursor];
        insertMention((m as any).username, (m as any).id ?? (m as any)._id);
      } else if (e.key === 'ArrowDown') setMentionCursor((c) => Math.min(c + 1, mentionMatches.length - 1));
      else if (e.key === 'ArrowUp') setMentionCursor((c) => Math.max(c - 1, 0));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEmojiClick = (emojiData: any) => {
    setValue((v) => v + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="px-3 pb-safe pb-3 pt-2 md:px-4 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800/50 flex-shrink-0 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.2)]">
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 bg-slate-800/60 border-l-2 border-primary-500 rounded-xl px-3 py-2 mb-2 overflow-hidden"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary-400 font-medium">{replyTo.sender.username}</p>
              <p className="text-xs text-slate-400 truncate">{replyTo.content}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancelReply}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <AnimatePresence>
          {showMentionPicker && room && mentionMatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-slate-800/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto"
            >
              {mentionMatches.map((m, i) => (
                <motion.button
                  key={(m as any).id ?? (m as any)._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => insertMention((m as any).username, (m as any).id ?? (m as any)._id)}
                  className={clsx('w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 transition-colors', i === mentionCursor ? 'bg-primary-600/40' : 'hover:bg-slate-700/80')}
                >
                  <span className="text-primary-400">@</span>
                  <span className="text-white">{(m as any).username}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              className="absolute bottom-full mb-2 right-0 z-50"
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} theme={'dark' as any} height={320} width={280} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 transition-all focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEmoji((p) => !p)}
            className={clsx('flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-colors', showEmoji ? 'text-primary-400 bg-primary-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50')}
          >
            😊
          </motion.button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm resize-none outline-none max-h-36 leading-relaxed py-1.5"
            style={{ minHeight: '24px' }}
          />

          <motion.button
            whileHover={{ scale: value.trim() ? 1.05 : 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
