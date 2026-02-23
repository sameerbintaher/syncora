'use client';

import { motion } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';

export default function ChatIndexPage() {
  const { open: openSidebar, isDesktop } = useSidebar();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0 relative overflow-hidden">
      {/* Subtle accent orb - one refined highlight */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-primary-500/[0.04] blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-sm relative z-10"
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] flex items-center justify-center mx-auto mb-6"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            className="w-10 h-10 text-primary-400/70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </motion.div>
        <h2 className="text-lg font-semibold text-white mb-2">No conversation selected</h2>
        <p className="text-slate-500 text-sm mb-6">
          Pick a chat from the sidebar or start a new one to get started
        </p>
        {!isDesktop ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={openSidebar}
            className="px-6 py-3 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-500
              shadow-lg shadow-primary-600/20 hover:shadow-primary-500/25 transition-all"
          >
            Open conversations
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 text-slate-500 text-sm"
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ← Select from sidebar
            </motion.span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
