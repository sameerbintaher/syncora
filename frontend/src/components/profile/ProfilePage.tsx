'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { User } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Props {
  userId?: string;
}

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.NEXT_PUBLIC_API_URL}${avatar}`;
}

export default function ProfilePage({ userId }: Props) {
  const { user: currentUser, setAuth, accessToken } = useAuthStore();
  const isOwn = !userId || userId === currentUser?.id || userId === (currentUser as any)?._id;

  const [profile, setProfile] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [form, setForm] = useState({ username: '', bio: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const endpoint = isOwn ? '/users/me' : `/users/${userId}`;
    api.get(endpoint).then(({ data }) => {
      setProfile(data.data.user);
      setForm({ username: data.data.user.username, bio: data.data.user.bio || '' });
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
    if (!isOwn && userId) {
      api.get('/users/blocked').then(({ data }) => {
        setIsBlocked(data.data.users.some((u: User) => (u.id || (u as any)._id) === userId));
      }).catch(() => {});
    }
  }, [userId, isOwn]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data } = await api.patch('/users/me', form);
      setProfile(data.data.user);
      if (accessToken) setAuth(data.data.user, accessToken);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const { data } = await api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(data.data.user);
      if (accessToken) setAuth(data.data.user, accessToken);
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  const handleBlock = async () => {
    try {
      if (isBlocked) {
        await api.delete(`/users/${userId}/block`);
        setIsBlocked(false);
        toast.success('User unblocked');
      } else {
        await api.post(`/users/${userId}/block`);
        setIsBlocked(true);
        toast.success('User blocked');
      }
    } catch {
      toast.error('Action failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex-1 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            {getAvatarUrl(profile.avatar) ? (
              <img src={getAvatarUrl(profile.avatar)} alt={profile.username} className="w-20 h-20 rounded-full object-cover border-2 border-slate-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-2xl font-semibold border-2 border-slate-700">
                {profile.username?.slice(0, 2).toUpperCase()}
              </div>
            )}
            {isOwn && (
              <>
                <button onClick={() => fileRef.current?.click()} className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('w-2 h-2 rounded-full', profile.isOnline ? 'bg-emerald-500' : 'bg-slate-500')} />
            <span className="text-xs text-slate-500">
              {profile.isOnline ? 'Online' : profile.lastSeen ? `Last seen ${formatDistanceToNow(new Date(profile.lastSeen), { addSuffix: true })}` : 'Offline'}
            </span>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                <input className="input-field" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bio</label>
                <textarea className="input-field resize-none" rows={3} maxLength={160} placeholder="About you..." value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
                <p className="text-xs text-slate-600 text-right mt-1">{form.bio.length}/160</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-800/50 text-sm transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 btn-primary text-sm">{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Username</p>
                <p className="text-white font-medium">@{profile.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Email</p>
                <p className="text-slate-300 text-sm">{profile.email}</p>
              </div>
              {profile.bio && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Bio</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Member since</p>
                <p className="text-slate-400 text-sm">{new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              {isOwn ? (
                <button onClick={() => setIsEditing(true)} className="btn-primary w-full mt-2">Edit profile</button>
              ) : (
                <button onClick={handleBlock} className={clsx('w-full py-2 rounded-lg text-sm font-medium transition-colors mt-2', isBlocked ? 'border border-slate-600 text-slate-400 hover:bg-slate-800/50' : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30')}>
                  {isBlocked ? 'Unblock' : 'Block user'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
