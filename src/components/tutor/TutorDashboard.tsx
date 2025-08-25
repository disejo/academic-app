/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  documentId,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import StudentReportCard from './components/StudentReportCard';
import TutorChartsContainer from './TutorChartsContainer';

// Interfaces
interface Student {
  id: string;
  name: string;
  email: string;
  dni: string;
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
  </div>
);


// Error Message Component
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-center py-10 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
    <p className="text-red-600 dark:text-red-400 font-semibold">¡Oops! Algo salió mal.</p>
    <p className="text-red-500 dark:text-red-500 mt-2">{message}</p>
  </div>
);

export default function TutorDashboard() {
  // State Hooks
  const { user, loading: authLoading } = useAuth();
  const [myChildren, setMyChildren] = useState<Student[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Fetch Children Callback
  const fetchMyChildren = useCallback(async () => {
    if (authLoading || !user?.uid) return;
    setLoadingChildren(true);
    try {
      const tutorRef = doc(db, 'users', user.uid);
      const tutorSnap = await getDoc(tutorRef);
      if (tutorSnap.exists()) {
        const childrenIds = tutorSnap.data().children || [];
        if (childrenIds.length > 0) {
          const studentsQuery = query(collection(db, 'users'), where(documentId(), 'in', childrenIds));
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          setMyChildren(studentsData);
        } else {
          setMyChildren([]);
        }
      } else {
        setError("No se encontró un perfil de tutor para este usuario.");
      }
    } catch (err) {
      setError("No se pudieron obtener los datos de tus hijos.");
    } finally {
      setLoadingChildren(false);
    }
  }, [user, authLoading]);

  // Effects
  useEffect(() => {
    fetchMyChildren();
  }, [fetchMyChildren]);

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoadingSearch(true);
    setError(null);
    setSearchResults([]);
    try {
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'ESTUDIANTE'), where('dni', '==', searchTerm.trim()));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      const myChildrenIds = new Set(myChildren.map(c => c.id));
      const filteredResults = studentsData.filter(s => !myChildrenIds.has(s.id));
      setSearchResults(filteredResults);
      if (filteredResults.length === 0) {
        setError("No se encontró ningún estudiante con ese DNI, o ya está asociado a tu cuenta.");
      }
    } catch (err) {
      setError("Ocurrió un error durante la búsqueda.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAssociateChild = async (studentId: string) => {
    if (!user?.uid) return;
    setError(null);
    try {
      const tutorRef = doc(db, 'users', user.uid);
      await updateDoc(tutorRef, { children: arrayUnion(studentId) });
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { tutorId: user.uid });
      await fetchMyChildren();
      setSearchTerm('');
      setSearchResults([]);
    } catch (err) {
      setError("Error al asociar al hijo.");
    }
  };

  // Eliminar hijo asociado
  const handleRemoveChild = async (studentId: string) => {
    if (!user?.uid) return;
    setError(null);
    try {
      const tutorRef = doc(db, 'users', user.uid);
      await updateDoc(tutorRef, { children: myChildren.filter(child => child.id !== studentId).map(child => child.id) });
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { tutorId: null });
      await fetchMyChildren();
    } catch (err) {
      setError("Error al eliminar al hijo.");
    }
  };

  const handleSelectChild = (studentId: string) => setSelectedStudentId(studentId);
  const handleBackToDashboard = () => setSelectedStudentId(null);

  // Render Logic
  if (authLoading) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <ErrorMessage message="Ningún usuario ha iniciado sesión. Por favor, inicie sesión." />;
  }

  if (selectedStudentId) {
    const selectedChild = myChildren.find(c => c.id === selectedStudentId);
    return (
      <div className="container mx-auto p-4 sm:p-6 mt-14 bg-white dark:bg-black text-gray-700 dark:text-white">
         <button 
            onClick={handleBackToDashboard} 
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Volver al Panel
        </button>
        <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Boletín de {selectedChild?.name}</h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">DNI: {selectedChild?.dni}</p>
        </div>
        <StudentReportCard studentId={selectedStudentId} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 mt-14 bg-white dark:bg-black text-gray-700 dark:text-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="p-6 bg-gray-300 dark:bg-gray-800 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold mb-5">Mis Hijos</h3>
          {loadingChildren ? <LoadingSpinner /> : myChildren.length > 0 ? (
            <ul className="space-y-4">
              {myChildren.map(child => (
                <li key={child.id} className="flex items-center justify-between">
                  <button onClick={() => handleSelectChild(child.id)} className="flex-1 text-left block p-5 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <p className="font-bold text-lg text-blue-800 dark:text-blue-300">{child.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">DNI: {child.dni}</p>
                  </button>
                  <button
                    onClick={() => handleRemoveChild(child.id)}
                    className="ml-4 px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                    title="Eliminar hijo"
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10 px-4 bg-gray-200 dark:bg-gray-700/50 rounded-lg">
                 <p className="font-semibold text-gray-700 dark:text-gray-300">No hay hijos asociados</p>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Use el formulario de búsqueda para encontrar y asociar a su hijo.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-300 dark:bg-gray-800 rounded-xl shadow-lg text-gray-700 dark:text-white">
          <h3 className="text-2xl font-bold mb-5">Buscar y Asociar Hijo</h3>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
                <label htmlFor="search-dni" className="sr-only">DNI del estudiante</label>
                <input
                id="search-dni"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ingresa el DNI de tu hijo"
                className="w-full p-3 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
            </div>
            <button type="submit" disabled={loadingSearch} className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all">
              {loadingSearch ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {error && <ErrorMessage message={error} />}

          {searchResults.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Resultados de la Búsqueda:</h4>
              <ul className="space-y-3 mt-3">
                {searchResults.map(student => (
                  <li key={student.id} className="flex justify-between items-center p-4 bg-gray-300 dark:bg-gray-700/50 rounded-lg">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{student.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">DNI: {student.dni}</p>
                    </div>
                    <button onClick={() => handleAssociateChild(student.id)} className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all">
                      Añadir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <TutorChartsContainer key={myChildren.map(c => c.id).join(',')} />
    </div>
  );
}
