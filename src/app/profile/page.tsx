'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
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
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user) return;

    try {
      // Update display name in Firebase Auth
      await updateProfile(user, { displayName: name });

      // Update name in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name });

      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user || !currentPassword) {
        setError("Please enter your current password to change your email.");
        return;
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, email);

        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { email });

        setSuccess('Email updated successfully! Please log in again.');
        setTimeout(() => auth.signOut(), 3000);
    } catch (err: any) {
        setError(err.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user || !currentPassword || !newPassword) {
        setError("Please fill all password fields.");
        return;
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        setSuccess('Password updated successfully! Please log in again.');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => auth.signOut(), 3000);
    } catch (err: any) {
        setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">My Profile</h1>
        
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}

        {/* Update Profile Form */}
        <form onSubmit={handleUpdateProfile} className="mb-10">
          <h2 class="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-bold mb-2">Name:</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Update Name</button>
        </form>

        <hr className="my-8"/>

        {/* Update Email Form */}
        <form onSubmit={handleUpdateEmail} className="mb-10">
          <h2 class="text-xl font-semibold mb-4">Update Email</h2>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-2">New Email:</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="mb-4">
            <label htmlFor="currentPasswordEmail" className="block text-sm font-bold mb-2">Current Password:</label>
            <input type="password" id="currentPasswordEmail" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Update Email</button>
        </form>

        <hr className="my-8"/>

        {/* Update Password Form */}
        <form onSubmit={handleUpdatePassword}>
          <h2 class="text-xl font-semibold mb-4">Update Password</h2>
          <div className="mb-4">
            <label htmlFor="currentPasswordPass" className="block text-sm font-bold mb-2">Current Password:</label>
            <input type="password" id="currentPasswordPass" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-bold mb-2">New Password:</label>
            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Update Password</button>
        </form>

      </div>
    </div>
  );
}
