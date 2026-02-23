'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSocket } from '@/hooks/useSocket';
import { SidebarProvider } from '@/contexts/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  useSocket();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-premium">
        <div className="fixed inset-0 bg-premium-accent pointer-events-none" />
        <div className="w-10 h-10 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin relative z-10" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen min-h-dvh flex justify-center bg-premium">
        {/* Premium background - full bleed behind chat */}
        <div className="fixed inset-0 bg-premium-accent pointer-events-none" />
        <div className="fixed inset-0 bg-premium-dots opacity-40 pointer-events-none" />
        <div className="fixed inset-0 bg-premium-vignette pointer-events-none" />
        {/* Chat container: full width on mobile, two-thirds width centered on desktop */}
        <div className="w-full lg:w-2/3 lg:max-w-6xl flex h-screen h-dvh overflow-hidden relative lg:mx-auto lg:shadow-2xl lg:border-x lg:border-slate-800/50">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 relative">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
