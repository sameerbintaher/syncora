'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

function FloatingOrb({
  className,
  duration = 20,
  delay = 0,
}: {
  className: string;
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[100px] ${className}`}
      animate={{
        x: [0, 25, -15, 0],
        y: [0, -20, 12, 0],
        scale: [1, 1.08, 0.96, 1],
      }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

function FloatingShape({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      style={style}
      animate={{ rotate: [0, 4, -4, 0], y: [0, -8, 0] }}
      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 relative overflow-hidden bg-premium">
      {/* Premium gradient overlay - soft ambient glow */}
      <div className="absolute inset-0 bg-premium-accent" />

      {/* Refined dot grid - subtle, premium feel */}
      <div className="absolute inset-0 bg-premium-dots opacity-60" />

      {/* Subtle vignette for depth */}
      <div className="absolute inset-0 bg-premium-vignette pointer-events-none" />

      {/* Floating orbs - softer, more refined */}
      <FloatingOrb className="w-[450px] h-[450px] -top-72 -left-72 bg-primary-500/12" duration={24} />
      <FloatingOrb className="w-[380px] h-[380px] top-1/2 -right-56 bg-primary-400/8" duration={20} delay={1} />
      <FloatingOrb className="w-[320px] h-[320px] bottom-0 left-1/3 bg-amber-500/6" duration={28} delay={2} />
      <FloatingOrb className="w-[180px] h-[180px] top-1/3 right-1/4 bg-primary-400/6" duration={14} delay={0.5} />

      {/* Minimal geometric accents */}
      <FloatingShape className="w-16 h-16 border border-white/[0.06] rounded-2xl top-[18%] left-[12%]" style={{ transform: 'rotate(12deg)' }} />
      <FloatingShape className="w-10 h-10 border border-white/[0.05] rounded-full top-[28%] right-[18%]" style={{ transform: 'rotate(-8deg)' }} />
      <FloatingShape className="w-12 h-12 border border-white/[0.04] rounded-lg bottom-[25%] right-[22%]" style={{ transform: 'rotate(18deg)' }} />
      <FloatingShape className="w-8 h-8 border border-white/[0.04] rounded-full bottom-[35%] left-[18%]" style={{ transform: 'rotate(-12deg)' }} />

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-block">
            <motion.h1
              className="text-4xl font-bold text-white tracking-tight"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              Sync
              <span className="bg-gradient-to-r from-primary-400 via-primary-300 to-amber-200 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                ora
              </span>
            </motion.h1>
          </Link>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-500 text-sm mt-2"
          >
            Real-time chat that feels alive
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="relative"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-primary-500/20 via-primary-400/15 to-primary-500/20 rounded-3xl blur-2xl opacity-70" />
          <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 border border-white/[0.06] shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/25 to-transparent rounded-t-3xl" />
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
