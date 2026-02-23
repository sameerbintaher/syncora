import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, setAuth, clearAuth } = useAuthStore();

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        const { data } = await api.post('/auth/register', { username, email, password });
        setAuth(data.data.user, data.data.accessToken);
        router.push('/chat');
        toast.success('Welcome to Syncora!');
      } catch (err: any) {
        const message = err.response?.data?.message || 'Registration failed';
        toast.error(message);
        throw err;
      }
    },
    [router, setAuth]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await api.post('/auth/login', { email, password });
        setAuth(data.data.user, data.data.accessToken);
        router.push('/chat');
        toast.success(`Welcome back, ${data.data.user.username}!`);
      } catch (err: any) {
        const message = err.response?.data?.message || 'Login failed';
        toast.error(message);
        throw err;
      }
    },
    [router, setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Proceed with local logout even if server call fails
    } finally {
      clearAuth();
      disconnectSocket();
      router.push('/auth/login');
    }
  }, [router, clearAuth]);

  return { user, isAuthenticated, isLoading, register, login, logout };
}
