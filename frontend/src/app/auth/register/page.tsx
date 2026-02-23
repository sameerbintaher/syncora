'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const validate = () => {
    const errs: Partial<typeof form> = {};
    if (!form.username || form.username.length < 3) errs.username = 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Username may only contain letters, numbers, and underscores';
    if (!form.email) errs.email = 'Email is required';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) errs.password = 'Password must contain uppercase, lowercase, and a number';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await register(form.username, form.email, form.password);
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { name: 'username', label: 'Username', type: 'text', placeholder: 'johndoe', autocomplete: 'username' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' },
    { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
  ] as const;

  return (
    <>
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-white mb-6"
      >
        Create account
      </motion.h2>

      <motion.form
        variants={container}
        initial="hidden"
        animate="show"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {fields.map(({ name, label, type, placeholder, autocomplete }) => (
          <motion.div key={name} variants={item}>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <input
              type={type}
              className="input-field"
              placeholder={placeholder}
              value={form[name]}
              onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
              autoComplete={autocomplete}
            />
            {errors[name] && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs mt-1.5"
              >
                {errors[name]}
              </motion.p>
            )}
          </motion.div>
        ))}

        <motion.div variants={item}>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-6"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </motion.div>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-slate-400 text-sm mt-6"
      >
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="text-primary-400 hover:text-primary-300 font-medium transition-colors inline-flex items-center gap-1 group"
        >
          Sign in
          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </motion.p>
    </>
  );
}
