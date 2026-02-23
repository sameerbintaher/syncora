'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const validate = () => {
    const errs: Partial<typeof form> = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(form.email, form.password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white mb-2">
        Welcome back
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-slate-500 text-sm mb-6"
      >
        Sign in to continue to Syncora
      </motion.p>

      <motion.form variants={container} initial="hidden" animate="show" onSubmit={handleSubmit} className="space-y-5">
        <motion.div variants={item} className="group">
          <label className="block text-sm font-medium text-slate-400 mb-2 group-focus-within:text-primary-400 transition-colors">
            Email
          </label>
          <input
            type="email"
            className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500
              transition-all duration-300 focus:outline-none focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20
              hover:border-slate-600 hover:bg-slate-800/70"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            autoComplete="email"
          />
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs mt-1.5"
              >
                {errors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={item} className="group">
          <label className="block text-sm font-medium text-slate-400 mb-2 group-focus-within:text-primary-400 transition-colors">
            Password
          </label>
          <input
            type="password"
            className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500
              transition-all duration-300 focus:outline-none focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20
              hover:border-slate-600 hover:bg-slate-800/70"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="current-password"
          />
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs mt-1.5"
              >
                {errors.password}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={item}>
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500
              hover:from-primary-500 hover:to-primary-400
              transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-primary-600/25 hover:shadow-primary-500/30"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </motion.div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 pt-6 border-t border-slate-800"
      >
        <p className="text-center text-slate-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="group inline-flex items-center gap-1.5">
            <span className="text-primary-400 font-medium group-hover:text-primary-300 transition-colors">Create one</span>
            <motion.span className="text-primary-400" animate={{ x: [0, 4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              →
            </motion.span>
          </Link>
        </p>
      </motion.div>
    </>
  );
}
