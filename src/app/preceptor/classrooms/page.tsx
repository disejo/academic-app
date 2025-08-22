'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface Classroom {
  id: string;
  name: string;
  createdAt: Date;
}

const ClassroomsPage = () => {
  const { user } = useAuth();
  console.log("Navigated to Preceptor Classrooms List Page. User:", user);
  const [classroomName, setClassroomName] = useState('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canCreate = user && ['admin', 'directivo', 'preceptor'].includes(user.role ?? '');

  useEffect(() => {
    const q = query(collection(db, 'classrooms'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const classroomsData: Classroom[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        classroomsData.push({ 
            id: doc.id, 
            name: data.name,
            createdAt: data.createdAt.toDate() 
        });
      });
      setClassrooms(classroomsData);
    }, (err) => {
        console.error("Error fetching classrooms: ", err);
        setError("No se pudieron cargar las aulas. Por favor, inténtelo de nuevo más tarde.");
    });

    return () => unsubscribe();
  }, []);

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
        setError("No tienes permiso para crear aulas.");
        return;
    }
    if (!classroomName.trim()) {
      setError('El nombre del aula no puede estar vacío.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'classrooms'), {
        name: classroomName,
        createdAt: new Date(),
      });
      setClassroomName('');
    } catch (err) {
      console.error('Error adding classroom: ', err);
      setError('No se pudo crear el aula. Inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 text-gray-900 dark:text-gray-100 mt-14">
      {canCreate && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">Crear Nueva Aula</h2>
          <form onSubmit={handleAddClassroom}>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={classroomName}
                onChange={(e) => setClassroomName(e.target.value)}
                placeholder="Ej: Primer Año 'A'"
                className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800"
              >
                {loading ? 'Creando...' : 'Crear Aula'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Aulas Existentes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Haz clic en un aula para administrar los estudiantes.</p>
        {classrooms.length === 0 ? (
          <p>No hay aulas creadas todavía.</p>
        ) : (
          <div className="space-y-3">
            {classrooms.map((classroom) => (
              <Link key={classroom.id} href={`/preceptor/classrooms/${classroom.id}`} legacyBehavior>
                <a className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-lg">{classroom.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Creada: {classroom.createdAt.toLocaleDateString()}</span>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomsPage;