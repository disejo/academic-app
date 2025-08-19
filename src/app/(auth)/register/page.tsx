'use client';

import { useState } from 'react';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ESTUDIANTE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== repeatPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        phone,
        role,
      });
      router.push('/login?message=Usuario creado exitosamente. Por favor inicia sesión.');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="bg-white bg-opacity-90 p-8 rounded-xl shadow-lg w-full max-w-2xl dark:bg-gray-900 dark:bg-opacity-90">
        <h1 className="text-3xl font-bold mb-6 text-center text-green-900 dark:text-green-300">Registro de Usuario</h1>
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Apellido y Nombre:</label>
            <input
              type="text"
              id="name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Correo electrónico:</label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Teléfono:</label>
            <input
              type="tel"
              id="phone"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Usuario:</label>
            <select
              id="role"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="TUTOR">Tutor</option>
              <option value="ESTUDIANTE">Estudiante</option>
            </select>
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contraseña:</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="absolute right-3 top-9 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Image
                src={showPassword ? "/eye.svg" : "/eye-off.svg"}
                alt={showPassword ? "Ocultar" : "Ver"}
                width={24}
                height={24}
                className="transition-colors duration-200 filter dark:invert dark:brightness-150 text-gray-500 dark:text-gray-300"
              />
            </span>
          </div>
          <div className="relative">
            <label htmlFor="repeatPassword" className="block text-gray-700 text-sm font-bold mb-2">Repetir Contraseña:</label>
            <input
              type={showRepeatPassword ? "text" : "password"}
              id="repeatPassword"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline pr-10"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              required
            />
            <span
              className="absolute right-3 top-9 cursor-pointer"
              onClick={() => setShowRepeatPassword(!showRepeatPassword)}
              aria-label={showRepeatPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Image
                src={showRepeatPassword ? "/eye.svg" : "/eye-off.svg"}
                alt={showRepeatPassword ? "Ocultar" : "Ver"}
                width={24}
                height={24}
                className="transition-colors duration-200 filter dark:invert dark:brightness-150 text-gray-500 dark:text-gray-300"
              />
            </span>
          </div>
          <div className="md:col-span-2">
            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Registrando, espera...' : 'Registrar'}
            </button>
            <p className="mt-4 text-center text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="text-[#7BF1A8] hover:underline">
                Iniciar sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
