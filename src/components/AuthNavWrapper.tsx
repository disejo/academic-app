'use client';

import { useAuth } from '@/hooks/useAuth';
import Nav from '@/components/nav';

export default function AuthNavWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner/skeleton
  }

  if (user) {
    return <Nav />;
  }

  return null;
}
