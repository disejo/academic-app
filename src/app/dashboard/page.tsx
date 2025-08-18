'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import DocenteDashboard from '@/components/dashboard/DocenteDashboard';
import EstudianteDashboard from '@/components/dashboard/EstudianteDashboard';
import DirectivoDashboard from '@/components/dashboard/DirectivoDashboard';
import PreceptorDashboard from '@/components/dashboard/PreceptorDashboard';
import TutorDashboard from '@/components/tutor/TutorDashboard';

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // Handle case where user exists in Auth but not in Firestore
          console.error("No such document!");
          // Optionally, sign out the user if their profile is missing
          await signOut(auth);
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);



  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !userProfile) {
    return null; // Should redirect to login via useEffect or show loading
  }

  const renderDashboard = () => {
    switch (userProfile.role) {
      case 'ADMIN':
        return <AdminDashboard />;
      case 'DOCENTE':
        return <DocenteDashboard />;
      case 'ESTUDIANTE':
        return <EstudianteDashboard />;
      case 'DIRECTIVO':
        return <DirectivoDashboard />;
      case 'PRECEPTOR':
        return <PreceptorDashboard />;
      case 'TUTOR':
        return <TutorDashboard />;
      default:
        return <div>Unknown Role</div>;
    }
  };

  return (
    <>
      {renderDashboard()}
    </>
  );
}
