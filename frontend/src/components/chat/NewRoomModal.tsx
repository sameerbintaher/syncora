'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useChatStore } from '@/store/chat.store';
import { User } from '@/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onClose: () => void;
}

export default function NewRoomModal({ onClose }: Props) {
  const router = useRouter();
  const { addRoom } = useChatStore();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await api.get(`/rooms/users/search?q=${encodeURIComponent(query)}`);
      setResults(data.data.users);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleUser = (u: User) => {
    if (tab === 'direct') setSelected([u]);
    else setSelected((prev) => prev.find((x) => x.id === u.id || (x as any)._id === (u as any)._id) ? prev.filter((x) => x.id !== u.id && (x as any)._id !== (u as any)._id) : [...prev, u]);
  };

  const handleCreate = async () => {
    if (selected.length === 0) { toast.error('Select at least one user'); return; }
    if (tab === 'group' && !groupName.trim()) { toast.error('Group name required'); return; }
    setIsCreating(true);
    try {
      const memberIds = selected.map((u) => u.id || (u as any)._id);
      const { data } = await api.post('/rooms', { type: tab, memberIds, ...(tab === 'group' && { name: groupName.trim() }) });
      addRoom(data.data.room);
      router.push(`/chat/${data.data.room._id}`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[85vh] flex flex-col bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-t-xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="font-semibold text-white">New conversation</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
            {(['direct', 'group'] as const).map((t) => (
              <motion.button
                key={t}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setTab(t); setSelected([]); }}
                className={clsx('flex-1 py-2.5 text-sm rounded-lg font-medium transition-all', tab === t ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50')}
              >
                {t === 'direct' ? 'Direct' : 'Group'}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'group' && (
              <motion.div
                key="groupName"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input type="text" className="input-field" placeholder="Group name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>

          <input type="text" className="input-field" placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} />

          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-2"
              >
                {selected.map((u) => (
                  <motion.span
                    key={u.id || (u as any)._id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 bg-primary-600/20 text-primary-300 text-xs px-2.5 py-1.5 rounded-lg border border-primary-500/30"
                  >
                    {u.username}
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => toggleUser(u)} className="hover:text-white">×</motion.button>
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {results.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.map((u, i) => {
                const isSelected = selected.some((s) => s.id === u.id || (s as any)._id === (u as any)._id);
                return (
                  <motion.button
                    key={u.id || (u as any)._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 4 }}
                    onClick={() => toggleUser(u)}
                    className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors', isSelected ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-slate-800/60 border border-transparent')}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-slate-300 text-xs font-medium">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-slate-200">{u.username}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCreate}
            disabled={isCreating || selected.length === 0}
            className="btn-primary w-full"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Creating...
              </span>
            ) : (
              'Start conversation'
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
