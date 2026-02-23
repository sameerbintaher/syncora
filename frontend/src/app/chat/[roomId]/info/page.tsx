'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { Room, User } from '@/types';
import toast from 'react-hot-toast';

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.NEXT_PUBLIC_API_URL}${avatar}`;
}

function isAdmin(room: Room, userId: string): boolean {
  const admins = room.admins || [];
  return admins.some((a) => (typeof a === 'string' ? a : (a as any)._id) === userId);
}

export default function GroupInfoPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { rooms, updateRoom, removeRoom } = useChatStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const currentUserId = (user?.id ?? user?._id) || '';

  useEffect(() => {
    api.get(`/rooms/${roomId}`).then(({ data }) => {
      setRoom(data.data.room);
      setNewName(data.data.room?.name || '');
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [roomId]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      const { data } = await api.patch(`/rooms/${roomId}/name`, { name: newName.trim() });
      setRoom(data.data.room);
      updateRoom(roomId, data.data.room);
      setEditName(false);
      toast.success('Group name updated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post(`/rooms/${roomId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRoom(data.data.room);
      updateRoom(roomId, data.data.room);
      toast.success('Group image updated');
    } catch {
      toast.error('Failed to upload');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveMember = async (targetId: string) => {
    try {
      await api.delete(`/rooms/${roomId}/members/${targetId}`);
      const { data } = await api.get(`/rooms/${roomId}`);
      setRoom(data.data.room);
      updateRoom(roomId, data.data.room);
      toast.success('Member removed');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handlePromote = async (targetId: string) => {
    try {
      await api.post(`/rooms/${roomId}/admins/${targetId}`);
      const { data } = await api.get(`/rooms/${roomId}`);
      setRoom(data.data.room);
      updateRoom(roomId, data.data.room);
      toast.success('Admin promoted');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleDemote = async (targetId: string) => {
    try {
      await api.delete(`/rooms/${roomId}/admins/${targetId}`);
      const { data } = await api.get(`/rooms/${roomId}`);
      setRoom(data.data.room);
      updateRoom(roomId, data.data.room);
      toast.success('Admin demoted');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await api.post(`/rooms/${roomId}/leave`);
      removeRoom(roomId);
      router.push('/chat');
      toast.success('You left the group');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleMembersAdded = () => {
    setShowAddMembers(false);
    api.get(`/rooms/${roomId}`).then(({ data }) => {
      setRoom(data.data.room);
      updateRoom(roomId, data.data.room);
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!room || room.type !== 'group') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-slate-500">Not a group or not found.</p>
        <Link href={`/chat/${roomId}`} className="ml-2 text-primary-500">Back</Link>
      </div>
    );
  }

  const adminIds = new Set((room.admins || []).map((a) => typeof a === 'string' ? a : (a as any)._id));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60">
        <Link href={`/chat/${roomId}`} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-base font-semibold text-white">Group info</h1>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center">
          <label className="relative cursor-pointer">
            {getAvatarUrl(room.avatar) ? (
              <img src={getAvatarUrl(room.avatar)} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-slate-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-semibold text-slate-300">
                {(room.name || 'G').slice(0, 1).toUpperCase()}
              </div>
            )}
            {isAdmin(room, currentUserId) && (
              <>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs">Change</span>
                </div>
              </>
            )}
          </label>

          <div className="mt-3 flex items-center gap-2">
            {editName ? (
              <>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm w-48"
                  autoFocus
                />
                <button onClick={handleUpdateName} className="text-primary-500 text-sm font-medium">Save</button>
                <button onClick={() => { setEditName(false); setNewName(room.name || ''); }} className="text-slate-500 text-sm">Cancel</button>
              </>
            ) : (
              <>
                <span className="text-white font-medium">{room.name || 'Group'}</span>
                {isAdmin(room, currentUserId) && (
                  <button onClick={() => setEditName(true)} className="text-slate-500 hover:text-white text-sm">Edit</button>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-300">Members ({room.members?.length || 0})</h2>
            {isAdmin(room, currentUserId) && (
              <button onClick={() => setShowAddMembers(true)} className="text-primary-500 text-sm font-medium">
                Add members
              </button>
            )}
          </div>
          <div className="space-y-1">
            {(room.members || []).map((m) => {
              const mid = (m as any).id ?? (m as any)._id;
              const memberIsAdmin = adminIds.has(mid);
              return (
                <div key={mid} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    {getAvatarUrl((m as any).avatar) ? (
                      <img src={getAvatarUrl((m as any).avatar)} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-sm">
                        {((m as any).username || '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{(m as any).username}</p>
                      {memberIsAdmin && <span className="text-xs text-primary-400">Admin</span>}
                    </div>
                  </div>
                  {isAdmin(room, currentUserId) && mid !== currentUserId && (
                    <div className="flex items-center gap-1">
                      {memberIsAdmin ? (
                        <button onClick={() => handleDemote(mid)} className="text-xs text-slate-500 hover:text-white px-2 py-1">Demote</button>
                      ) : (
                        <button onClick={() => handlePromote(mid)} className="text-xs text-primary-500 px-2 py-1">Promote</button>
                      )}
                      <button onClick={() => handleRemoveMember(mid)} className="text-xs text-red-400 px-2 py-1">Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleLeave} className="w-full py-2.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm font-medium">
          Leave group
        </button>
      </div>

      {showAddMembers && (
        <AddMembersModal
          roomId={roomId}
          existingIds={(room.members || []).map((m) => (m as any).id ?? (m as any)._id)}
          onClose={() => setShowAddMembers(false)}
          onAdded={handleMembersAdded}
        />
      )}
    </div>
  );
}

function AddMembersModal({ roomId, existingIds, onClose, onAdded }: {
  roomId: string;
  existingIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get(`/rooms/users/search?q=${encodeURIComponent(query)}`);
      setResults(data.data.users.filter((u: User) => !existingIds.includes(u.id || (u as any)._id)));
    }, 300);
    return () => clearTimeout(t);
  }, [query, existingIds]);

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await api.post(`/rooms/${roomId}/members`, { memberIds: selected.map((u) => u.id || (u as any)._id) });
      onAdded();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-white">Add members</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
        </div>
        <div className="p-4 space-y-3">
          <input
            type="text"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map((u) => {
              const id = u.id || (u as any)._id;
              const isSelected = selected.some((s) => (s.id || (s as any)._id) === id);
              return (
                <button
                  key={id}
                  onClick={() => setSelected((prev) => isSelected ? prev.filter((x) => (x.id || (x as any)._id) !== id) : [...prev, u])}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${isSelected ? 'bg-primary-600/30' : 'hover:bg-slate-700'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-sm">
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-white">{u.username}</span>
                </button>
              );
            })}
          </div>
          <button onClick={handleAdd} disabled={selected.length === 0 || loading} className="btn-primary w-full">
            {loading ? 'Adding...' : `Add ${selected.length} member(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
