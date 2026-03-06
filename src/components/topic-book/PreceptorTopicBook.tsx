/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from 'firebase/auth';
import { doc, getDoc, updateDoc} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
interface UserProfile {
  name: string;
  email: string;
  role: string;
}
export default function PreceptorTopicBook() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setName(currentUser.displayName || '');
            setEmail(currentUser.email || '');
            
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            }
        } else {
            router.push('/login');
        }
        setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        // Simulate loading for the main dashboard, as sub-components fetch their own data
        const timer = setTimeout(() => {
        setLoading(false);
        }, 1000); // Simulate a 1-second loading time

        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
            <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="w-full mt-14 p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
        <div className="mx-auto">
        
        {error && <p className="text-red-500 text-center mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-md">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-md">{success}</p>}
        
        <h1>Preceptor Topic Book</h1>
        <p>Welcome, Preceptor!</p>
        </div>
        </div>
    );
}