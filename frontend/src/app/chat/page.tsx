'use client';

import { motion } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';

export default function ChatIndexPage() {
  const { open: openSidebar, isDesktop } = useSidebar();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface-950 min-h-0">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-sm"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-slate-500"
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
        </div>
        <p className="text-slate-500 text-sm mb-4">
          Select a conversation from the sidebar or start a new one
        </p>
        {!isDesktop && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openSidebar}
            className="btn-primary text-sm px-5"
          >
            Open conversations
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
