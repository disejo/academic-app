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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md dark:bg-gray-900 dark:text-gray-100">
        
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-6 text-center">Create New Student</h1>
          <form onSubmit={handleCreateStudent}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-bold mb-2 dark:text-gray-300">Name:</label>
              <input type="text" id="name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="mb-4">
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
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-bold mb-2 dark:text-gray-300">Email:</label>
              <input type="email" id="email" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-bold mb-2 dark:text-gray-300">Password:</label>
              <input type="password" id="password" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-bold mb-2 dark:text-gray-300">Phone:</label>
              <input type="tel" id="phone" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            
            <div className="mb-4">
                <label htmlFor="tutor" className="block text-sm font-bold mb-2 dark:text-gray-300">Assign Tutor (Optional):</label>
                <select id="tutor" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                  <option value="">None</option>
                  {tutors.length > 0 ? tutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  )) : (
                    <option value="" disabled>No Tutors Available</option>
                  )}
                </select>
              </div>
            
            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer" disabled={loading}>
              {loading ? 'Creating Student...' : 'Create Student'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
