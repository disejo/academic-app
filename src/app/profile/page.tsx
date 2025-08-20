/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from 'firebase/auth';
import { doc, getDoc, updateDoc} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailFormPassword, setEmailFormPassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

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

  const handlePasswordFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user) return;

    setIsSubmittingProfile(true);
    try {
      await updateProfile(user, { displayName: name });
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { name });
      setSuccess('¡Perfil actualizado con éxito!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user || !emailFormPassword) {
        setError("Por favor, introduce tu contraseña actual para cambiar tu correo electrónico.");
        return;
    }

    setIsSubmittingEmail(true);
    try {
        const credential = EmailAuthProvider.credential(user.email!, emailFormPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, email);

        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { email });

        setSuccess('¡Correo electrónico actualizado con éxito! Por favor, inicia sesión de nuevo.');
        setEmailFormPassword('');
        setTimeout(() => auth.signOut(), 3000);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmittingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user || !passwordForm.currentPassword || !passwordForm.newPassword) {
        setError("Por favor, rellena todos los campos de contraseña.");
        return;
    }

    setIsSubmittingPassword(true);
    try {
        const credential = EmailAuthProvider.credential(user.email!, passwordForm.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordForm.newPassword);

        setSuccess('¡Contraseña actualizada con éxito! Por favor, inicia sesión de nuevo.');
        setPasswordForm({ currentPassword: '', newPassword: '' });
        setTimeout(() => auth.signOut(), 3000);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmittingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-white dark:bg-black text-gray-700 dark:text-white">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex justify-center py-12 px-4 sm:px-6 lg:px-8 mt-8">
      <div className="w-full bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        
        {error && <p className="text-red-500 text-center mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-md">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-md">{success}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 bg-white dark:bg-black text-gray-700 dark:text-white">
          {/* Columna Izquierda */}
          <div className="flex flex-col gap-10">
            {/* Formulario de Información Personal */}
            <form onSubmit={handleUpdateProfile}>
              <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-bold mb-2">Nombre:</label>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
              </div>
              <button type="submit" disabled={isSubmittingProfile} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
                {isSubmittingProfile ? 'Actualizando...' : 'Actualizar Nombre'}
              </button>
            </form>

            {/* Formulario de Actualizar Email */}
            <form onSubmit={handleUpdateEmail}>
              <h2 className="text-xl font-semibold mb-4">Actualizar Correo Electrónico</h2>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-bold mb-2">Nuevo Correo:</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
              </div>
              <div className="mb-4">
                <label htmlFor="currentPasswordEmail" className="block text-sm font-bold mb-2">Contraseña Actual:</label>
                <input type="password" id="currentPasswordEmail" name="currentPassword" value={emailFormPassword} onChange={(e) => setEmailFormPassword(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
              </div>
              <button type="submit" disabled={isSubmittingEmail} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
                {isSubmittingEmail ? 'Actualizando...' : 'Actualizar Correo'}
              </button>
            </form>
          </div>

          {/* Columna Derecha */}
          <div className="flex flex-col gap-10">
            {/* Formulario de Actualizar Contraseña */}
            <form onSubmit={handleUpdatePassword}>
              <h2 className="text-xl font-semibold mb-4">Actualizar Contraseña</h2>
              <div className="mb-4">
                <label htmlFor="currentPasswordPass" className="block text-sm font-bold mb-2">Contraseña Actual:</label>
                <input type="password" id="currentPasswordPass" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordFormChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
              </div>
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-sm font-bold mb-2">Nueva Contraseña:</label>
                <input type="password" id="newPassword" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordFormChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
              </div>
              <button type="submit" disabled={isSubmittingPassword} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
                {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
