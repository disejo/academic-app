/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from 'firebase/auth';
import { doc, getDoc, updateDoc} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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

    // Validar que el usuario tenga los roles permitidos
    if (!role || !['ADMIN', 'DIRECTIVO', 'DOCENTE', 'PRECEPTOR'].includes(role)) {
      setError('No tienes permiso para actualizar tu nombre.');
      return;
    }

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 pt-16 px-4">
      <div className="w-full p-6 sm:p-8 rounded-xl shadow-2xl bg-white dark:bg-gray-800 dark:text-amber-50 border border-gray-200 dark:border-gray-700">
        
        {error && <p className="text-red-600 dark:text-red-400 text-center mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">{error}</p>}
        {success && <p className="text-green-600 dark:text-green-400 text-center mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">{success}</p>}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white">
          {/* Columna Izquierda */}
          <div className="space-y-8">
            {/* Formulario de Información Personal */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2">Información Personal</h2>
              <div>
                <label htmlFor="name" className="block text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Nombre:</label>
                <input 
                  type="text" 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  readOnly={!role || !['ADMIN', 'DIRECTIVO', 'DOCENTE', 'PRECEPTOR'].includes(role)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                />
              </div>
              {role && ['ADMIN', 'DIRECTIVO', 'DOCENTE', 'PRECEPTOR'].includes(role) && (
                <button type="submit" disabled={isSubmittingProfile} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-3 rounded-lg font-semibold transition-colors shadow-md">
                  {isSubmittingProfile ? 'Actualizando...' : 'Actualizar Nombre'}
                </button>
              )}
            </form>

            {/* Formulario de Actualizar Email */}
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2">Actualizar Correo Electrónico</h2>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Nuevo Correo:</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label htmlFor="currentPasswordEmail" className="block text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Contraseña Actual:</label>
                <input type="password" id="currentPasswordEmail" name="currentPassword" value={emailFormPassword} onChange={(e) => setEmailFormPassword(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <button type="submit" disabled={isSubmittingEmail} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-3 rounded-lg font-semibold transition-colors shadow-md">
                {isSubmittingEmail ? 'Actualizando...' : 'Actualizar Correo'}
              </button>
            </form>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-8">
            {/* Formulario de Actualizar Contraseña */}
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2">Actualizar Contraseña</h2>
              <div>
                <label htmlFor="currentPasswordPass" className="block text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Contraseña Actual:</label>
                <input type="password" id="currentPasswordPass" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordFormChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Nueva Contraseña:</label>
                <input type="password" id="newPassword" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordFormChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <button type="submit" disabled={isSubmittingPassword} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-3 rounded-lg font-semibold transition-colors shadow-md">
                {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
