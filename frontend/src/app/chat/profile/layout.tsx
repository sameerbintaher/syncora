'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMyProfile = pathname === '/chat/profile';
  const title = isMyProfile ? 'My Profile' : 'Profile';

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button - always visible */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 bg-surface-900/95 flex-shrink-0">
        <Link
          href="/chat"
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          aria-label="Back to chats"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-white flex-1">{title}</h1>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
