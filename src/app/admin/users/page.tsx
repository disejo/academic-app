'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Tutor {
  id: string;
  name: string;
}

export default function CreateUserPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ESTUDIANTE');
  const [tutorId, setTutorId] = useState('');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingTutors, setLoadingTutors] = useState(true);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (role === 'ESTUDIANTE' && !tutorId) {
      setError("Please select a tutor for the student.");
      return;
    }

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, phone, role, tutorId: role === 'ESTUDIANTE' ? tutorId : undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setRole('ESTUDIANTE');
        setTutorId('');
      } else {
        setError(data.error || 'An unknown error occurred');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md dark:bg-gray-900">
        <h1 className="text-2xl font-bold mb-6 text-center">Create New User</h1>
        <form onSubmit={handleCreateUser}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
            <input
              type="text"
              id="name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Phone:</label>
            <input
              type="tel"
              id="phone"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Role:</label>
            <select
              id="role"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== 'ESTUDIANTE') {
                  setTutorId(''); // Clear tutor selection if not a student
                }
              }}
            >
              <option value="ADMIN">Admin</option>
              <option value="DOCENTE">Docente</option>
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="DIRECTIVO">Directivo</option>
              <option value="PRECEPTOR">Preceptor</option>
              <option value="TUTOR">Tutor</option>
            </select>
          </div>
          {role === 'ESTUDIANTE' && (
            <div className="mb-4">
              <label htmlFor="tutor" className="block text-gray-700 text-sm font-bold mb-2">Assign Tutor:</label>
              {loadingTutors ? (
                <p>Loading tutors...</p>
              ) : tutors.length > 0 ? (
                <select
                  id="tutor"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={tutorId}
                  onChange={(e) => setTutorId(e.target.value)}
                  required={role === 'ESTUDIANTE'}
                >
                  <option value="">Select a Tutor</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              ) : (
                <p className="text-red-500 text-xs italic">No tutors found. Please create a TUTOR account first.</p>
              )}
            </div>
          )}
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
          >
            Create User
          </button>
        </form>
      </div>
    </div>
  );
}
