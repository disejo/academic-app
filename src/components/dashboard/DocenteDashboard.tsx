'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import TopTenStudents from './components/TopTenStudents';
import {SubjectPerformance} from './components/SubjectPerformance';
import {AdditionalInformation} from './components/AdditionalInformation';
import TotalStudents from './components/TotalStudents';
import BetterAverage from './components/BetterAverage';

export default function DocenteDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading for the main dashboard, as sub-components fetch their own data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Simulate a 1-second loading time

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-800 text-gray-100">
        Cargando datos del tablero...
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
    <div className="w-full p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-center">Panel de Docente</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TotalStudents />
        <BetterAverage />
      </div>
      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Acciones del Docente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/docente/grades" className="block">
            <button className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300">
              Ingresar Calificaciones
            </button>
          </Link>
          <Link href="/docente/programs" className="block">
            <button className="cursor-pointer bg-green-800 hover:bg-green-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300">
              Gestionar Programas
            </button>
          </Link>
        </div>
      </div>
      <TopTenStudents />
      <SubjectPerformance />
      <AdditionalInformation />
    </div>
  );
}
