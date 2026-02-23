'use client';

import { motion } from 'framer-motion';
import { useChatStore } from '@/store/chat.store';

interface Props {
  roomId: string;
  currentUserId: string;
}

export default function TypingIndicator({ roomId, currentUserId }: Props) {
  const typingUsers = useChatStore((s) => s.typingUsers[roomId] || []);
  const others = typingUsers.filter((u) => u.userId !== currentUserId);

  if (others.length === 0) return null;

  const label =
    others.length === 1
      ? `${others[0].username} is typing`
      : others.length === 2
      ? `${others[0].username} and ${others[1].username} are typing`
      : 'Several people are typing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/40 w-fit"
    >
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            className="w-2 h-2 rounded-full bg-primary-500/70"
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">{label}</span>
    </motion.div>
  );
}
