/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


interface Tutor {
  id: string;
  name: string;
}

export default function CreateStudentPage() {
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [tutorId, setTutorId] = useState('');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchTutors = async () => {
      setLoadingTutors(true);
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'TUTOR'));
        const querySnapshot = await getDocs(q);
        const fetchedTutors = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        })) as Tutor[];
        setTutors(fetchedTutors);
      } catch (err: any) {
        console.error("Error fetching tutors:", err);
        setError(err.message);
      } finally {
        setLoadingTutors(false);
      }
    };
    fetchTutors();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            email, 
            password, 
            name, 
            dni,
            phone, 
            role: 'ESTUDIANTE', // Hardcode role to ESTUDIANTE
            tutorId: tutorId ? tutorId : undefined 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setName('');
        setDni('');
        setEmail('');
        setPassword('');
        setPhone('');
        setTutorId('');
      } else {
        setError(data.error || 'An unknown error occurred');
      }
    } catch (err: any) {
      console.error("An error occurred:", err);
      setError("Failed to create student. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-200 to-green-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 mt-14">
      <div className="bg-white bg-opacity-90 p-10 rounded-xl shadow-2xl w-full max-w-3xl dark:bg-gray-900 dark:bg-opacity-90 dark:text-gray-100">
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-8'>
            <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">Crear Nuevo Estudiante</h1>
        </div>
        <div className="mb-10">
          <form onSubmit={handleCreateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-2 dark:text-gray-300">Nombre y Apellido:</label>
              <input type="text" id="name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="dni" className="block text-sm font-bold mb-2 dark:text-gray-300">DNI:</label>
              <input
                type="text"
                id="dni"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-2 dark:text-gray-300">Correo electrónico:</label>
              <input type="email" id="email" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2 dark:text-gray-300">Contraseña:</label>
              <input type="password" id="password" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-bold mb-2 dark:text-gray-300">Teléfono:</label>
              <input type="tel" id="phone" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="tutor" className="block text-sm font-bold mb-2 dark:text-gray-300">Asignar Tutor (opcional):</label>
              <select id="tutor" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                <option value="">Ninguno</option>
                {tutors.length > 0 ? tutors.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                )) : (
                  <option value="" disabled>No hay tutores disponibles</option>
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
              <button type="submit" className="bg-indigo-900 hover:bg-indigo-800 font-bold text-white py-3 px-6 rounded-md focus:outline-none focus:shadow-outline w-full cursor-pointer transition-all duration-200 shadow-md" disabled={loading}>
                {loading ? 'Creando estudiante...' : 'Crear estudiante'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
