'use client';
import ThemeToggleButton from '@/components/ThemeToggleButton';

import { useState } from 'react';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-gray-200 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <ThemeToggleButton />
      </div>
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md dark:bg-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-900 dark:text-blue-300">Iniciar Sesión</h1>
        <form onSubmit={handleLogin}>
          <div className="group mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Correo electrónico:</label>
            <div className="group relative flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className="absolute left-2 text-zinc-400 pointer-events-none group-focus-within:text-zinc-500 z-20" width="32" height="24px" viewBox="0 0 24 24"><path d="M20 8l-8 5l-8-5V6l8 5l8-5m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="currentColor"></path></svg>
              <input
                name="email"
                type="email"
                id="email"
                autoComplete="off"
                tabIndex={0}
                placeholder="Email"
                className="focus:ring-1 focus:outline-none w-full text-sm leading-6 rounded-md ring-1 shadow-sm transition duration-300 z-10 focus:ring-zinc-600 ring-gray-200 dark:ring-gray-700 placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-gray-900 h-12 pl-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={`-translate-y-3 transition-yspacing bg-red-100 ring-1 ring-red-100 -z-10 rounded-md h-0 ${error && error.toLowerCase().includes('email') ? 'visible' : 'invisible'}`}>
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="text-red-600" height="1rem"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                <p className="text-red-600 text-xs pl-2">{error && error.toLowerCase().includes('email') ? error : 'Email is required'}</p>
              </div>
            </div>
          </div>
          <div className="group mb-6 relative">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contraseña:</label>
            <div className="group relative flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className="absolute left-2 text-zinc-400 pointer-events-none group-focus-within:text-zinc-500 z-20" width="32" height="24px" viewBox="0 0 32 32"><path d="M21 2a8.998 8.998 0 0 0-8.612 11.612L2 24v6h6l10.388-10.388A9 9 0 1 0 21 2zm0 16a7.013 7.013 0 0 1-2.032-.302l-1.147-.348l-.847.847l-3.181 3.181L12.414 20L11 21.414l1.379 1.379l-1.586 1.586L9.414 23L8 24.414l1.379 1.379L7.172 28H4v-3.172l9.802-9.802l.848-.847l-.348-1.147A7 7 0 1 1 21 18z" fill="currentColor"></path><circle cx="22" cy="10" r="2" fill="currentColor"></circle></svg>
              <input
                name="password"
                placeholder="Password"
                type="password"
                autoComplete="off"
                tabIndex={0}
                id="password"
                className="focus:ring-1 focus:outline-none w-full text-sm leading-6 rounded-md ring-1 shadow-sm transition duration-300 z-10 focus:ring-zinc-600 ring-gray-200 dark:ring-gray-700 placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-gray-900 h-12 pl-11 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-autocomplete="list"
              />
            </div>
            <div className={`-translate-y-3 transition-yspacing bg-red-100 ring-1 ring-red-100 -z-10 rounded-md h-0 ${error && error.toLowerCase().includes('password') ? 'visible' : 'invisible'}`}>
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="text-red-600" height="1rem"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                <p className="text-red-600 text-xs pl-2">{error && error.toLowerCase().includes('password') ? error : 'Password is required'}</p>
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="relative">
            <div className="group relative flex items-center">
              <button
                tabIndex={0}
                className="hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-md border-indigo-500 text-indigo-600 dark:text-indigo-300 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border w-full z-10 h-12 group bg-white dark:bg-gray-900 transition-colors duration-300"
                type="submit"
                disabled={loading}
              >
                <div className="flex justify-center items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className="text-indigo-500 dark:text-indigo-400 pointer-events-none z-20 group-hover:scale-105 group-hover:-translate-y-0.5 transition-transform duration-200" width="32" height="24px" viewBox="0 0 24 24"><path d="M20 8l-8 5l-8-5V6l8 5l8-5m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="currentColor"></path></svg>
                  {loading ? 'Ingresando...' : 'Iniciar sesión con Email'}
                </div>
              </button>
            </div>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-black dark:text-white">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="text-[#1C398E] hover:underline dark:text-[#8EC5FF]">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
