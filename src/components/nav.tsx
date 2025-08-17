'use client';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Icon from '@mdi/react';
import { mdiAccountSchoolOutline } from '@mdi/js';
import { mdiLogout } from '@mdi/js';
import { mdiAccountEdit } from '@mdi/js';

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

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

    const handleLogout = async () => {
        try {
        await signOut(auth);
        router.push('/login');
        } catch (error) {
        console.error("Error logging out:", error);
        }
    };
  
    return (
        <>
        <nav className="bg-white dark:bg-gray-800 fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-4">
            <Link href="/dashboard" rel="noopener noreferrer" className="flex items-center space-x-3 rtl:space-x-reverse">
                <Icon path={mdiAccountSchoolOutline} size={1} />
                <span className="text-sm  text-gray-500 dark:text-white">Welcome, {userProfile?.name}!</span>
            </Link>
            <div className="flex items-center space-x-6 rtl:space-x-reverse">
                <Link href={'/profile'}>
                    <Icon path={mdiAccountEdit} size={1} color="gray" />
                </Link>
                <button onClick={handleLogout} className="cursor-pointer text-sm  text-blue-600 dark:text-blue-500 hover:underline"><Icon path={mdiLogout} size={1} /></button>
            </div>
        </div>
        </nav>
        </>
    );
}
