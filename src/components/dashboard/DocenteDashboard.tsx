'use client';
import { useState, useEffect } from 'react';

import TopTenStudents from './components/TopTenStudents';
import {SubjectPerformance} from './components/SubjectPerformance';
import {AdditionalInformation} from './components/AdditionalInformation';
import TotalStudents from './components/TotalStudents';
import BetterAverage from './components/BetterAverage';
import AssignedSubjects from './components/AssignedSubjects';
import { useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoadingSpinner } from '../LoadingSpinner';

// Main Dashboard Component
export default function DocenteDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  //Establecemos el usuario activo y si no esta logueado lo enviamos al login 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);



  const handleClickGrades = async () => {
    setLoading(true);
    await router.push('/docente/grades');
  };
  const handleClickPrograms = async () => {
    setLoading(true);
    await router.push('/docente/programs');
  };

  useEffect(() => {
    // Simulate loading for the main dashboard, as sub-components fetch their own data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Simulate a 1-second loading time

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
      <LoadingSpinner />
    </div>
  );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-800 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full mt-14 p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {user && (
        <>
          <TotalStudents />
          <BetterAverage />
        </>
      )}
      </div>
      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Acciones del Docente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleClickGrades}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Ingresar Calificaciones'}
          </button>
          <button
            onClick={handleClickPrograms}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-green-800 hover:bg-green-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Programas'}
          </button>
        </div>
      </div>
      {user && (
      <>
        <TopTenStudents />
        <SubjectPerformance />
        <AdditionalInformation />
        <AssignedSubjects user={user} role="DOCENTE" />
      </>
      )}
    </div>
  );
}
