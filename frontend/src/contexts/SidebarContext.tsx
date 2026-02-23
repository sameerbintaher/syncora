'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const SidebarContext = createContext<{
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isDesktop: boolean;
} | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((p) => !p), []);

  // On mobile only: open sidebar when on /chat index, close when entering a room.
  // On desktop, sidebar is always visible—no auto-close.
  useEffect(() => {
    if (isDesktop) return;
    const isChatIndex = pathname === '/chat';
    if (isChatIndex) {
      setIsOpen(true);
    } else if (pathname?.startsWith('/chat/')) {
      setIsOpen(false);
    }
  }, [pathname, isDesktop]);

  return (
    <SidebarContext.Provider value={{ isOpen, open, close, toggle, isDesktop }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
