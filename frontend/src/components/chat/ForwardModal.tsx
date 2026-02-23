'use client';

import { Message, Room } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface Props {
  message: Message;
  rooms: Room[];
  currentRoomId: string;
  currentUserId: string;
  onClose: () => void;
  onForwarded?: () => void;
}

function getRoomDisplayName(room: Room, currentUserId: string): string {
  if (room.type === 'group') return room.name || 'Group';
  const other = room.members.find((m) => (m.id ?? (m as any)._id) !== currentUserId);
  return other?.username || 'Direct Message';
}

export default function ForwardModal({ message, rooms, currentRoomId, currentUserId, onClose, onForwarded }: Props) {
  const targetRooms = rooms.filter((r) => r._id !== currentRoomId);

  const handleForward = async (targetRoomId: string) => {
    try {
      await api.post('/rooms/messages/forward', { messageId: message._id, targetRoomId });
      toast.success('Message forwarded');
      onForwarded?.();
      onClose();
    } catch {
      toast.error('Failed to forward message');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm max-h-[70vh] flex flex-col glass rounded-t-xl sm:rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Forward to</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{message.content}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {targetRooms.length === 0 ? (
            <p className="px-4 py-6 text-slate-500 text-sm text-center">No other conversations</p>
          ) : (
            targetRooms.map((room, i) => (
              <motion.button
                key={room._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ x: 4 }}
                onClick={() => handleForward(room._id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-left rounded-lg mx-2"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-slate-300 text-sm font-medium flex-shrink-0">
                  {getRoomDisplayName(room, currentUserId).slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-slate-200 truncate">{getRoomDisplayName(room, currentUserId)}</span>
              </motion.button>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t border-white/5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800/60 hover:text-white text-sm transition-colors"
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
