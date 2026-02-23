'use client';
import { useParams } from 'next/navigation';
import ProfilePage from '@/components/profile/ProfilePage';
export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  return <ProfilePage userId={userId} />;
}
