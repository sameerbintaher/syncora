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
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="w-10 h-10 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="flex h-screen h-dvh bg-surface-950 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 relative">{children}</main>
      </div>
    </SidebarProvider>
  );
}
