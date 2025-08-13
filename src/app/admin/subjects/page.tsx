'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Subject {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  createdBy: string;
}

export default function SubjectsPage() {
  const [subjectName, setSubjectName] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchSubjects();
      } else {
        // Redirect to login if not authenticated
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedSubjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subject[];
      setSubjects(fetchedSubjects);
    } catch (err: any) {
      console.error("Error fetching subjects:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be logged in to create a subject.");
      return;
    }
    try {
      await addDoc(collection(db, 'subjects'), {
        name: subjectName,
        description: subjectDescription,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      setSubjectName('');
      setSubjectDescription('');
      fetchSubjects(); // Refresh the list
    } catch (err: any) {
      console.error("Error creating subject:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Subjects...</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">Manage Subjects</h1>

        <form onSubmit={handleCreateSubject} className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Create New Subject</h2>
          <div className="mb-4">
            <label htmlFor="subjectName" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Subject Name:</label>
            <input
              type="text"
              id="subjectName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="subjectDescription" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Description (Optional):</label>
            <textarea
              id="subjectDescription"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={subjectDescription}
              onChange={(e) => setSubjectDescription(e.target.value)}
              rows={3}
            ></textarea>
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
          >
            Create Subject
          </button>
        </form>

        <h2 className="text-xl font-semibold mb-4">Existing Subjects</h2>
        {subjects.length === 0 ? (
          <p>No subjects found.</p>
        ) : (
          <ul className="space-y-4">
            {subjects.map((subject) => (
              <li key={subject.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="font-bold">{subject.name}</p>
                {subject.description && <p>{subject.description}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-400">Created by: {subject.createdBy} on {new Date(subject.createdAt?.toDate()).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
