/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter, usePathname  } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Icon from '@mdi/react';
import { mdiLogout } from '@mdi/js';
import IconComponentEditProfile from '../components/iconWithTootltip/IconComponentEditProfile';
import IconComponentDashboard from '../components/iconWithTootltip/IconComponentDashboard';


interface UserProfile {
  name: string;
  email: string;
  role: string;
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
  </div>
);

export default function NavBoard() {

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

  const [showSpinner, setShowSpinner] = useState(false);

  const handleLogout = async () => {
    setShowSpinner(true);
    try {
      await signOut(auth);
      setTimeout(() => {
        router.push('/login');
      }, 1800);
    } catch (error: any) {
      setShowSpinner(false);
      console.error("Error logging out:", error);
    }
  };
  
  return (
    <>
      {showSpinner ? (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-30 z-[100]">
          <LoadingSpinner />
        </div>
      ) : (
        <nav className="bg-white dark:bg-gray-800 fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600">
          <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <span className="text-sm capitalize text-gray-500 dark:text-white">Bienvenido, {userProfile?.name}!</span>
            </div>
            <div className="flex items-center space-x-6 rtl:space-x-reverse">
              <Link href={'/dashboard'}>
                <IconComponentDashboard direction={180} path={'/dashboard'} tooltipText={"Dashboard"} />
              </Link>
              <Link href={'/profile'}>
                <IconComponentEditProfile direction={180} path={'/profile'} tooltipText={"Perfil"} />
              </Link>
              <button onClick={handleLogout} className="cursor-pointer text-sm  text-blue-600 dark:text-blue-500 hover:underline"><Icon path={mdiLogout} size={1} /></button>
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
