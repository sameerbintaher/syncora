import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Syncora — Real-time Chat',
  description: 'A modern, secure real-time chat platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} font-sans bg-surface-950 text-slate-100 antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 13, 36, 0.95)',
              color: '#f1f5f9',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}
