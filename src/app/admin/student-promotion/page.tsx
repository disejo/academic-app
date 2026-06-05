/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import {LoadingSpinner} from '@/components/LoadingSpinner';





export default function StudentPromotionPage() {
    const { user, loading: authLoading } = useAuth();
    const [academicCycles, setAcademicCycles] = useState<any[]>([]);

    useEffect(() => {
      const fetchAcademicCycles = async () => {
        try {
          const cyclesSnapshot = await getDocs(collection(db, 'academicCycles'));
          const cyclesData = cyclesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setAcademicCycles(cyclesData);
        } catch (error) {
          console.error('Error fetching academic cycles:', error);
        }
      };
  
      fetchAcademicCycles();
    }, []);
    
    // Check if user has admin or directivo role
    if (authLoading) {
      return <LoadingSpinner />;
    }
  
    if (!user || !user.role || !['ADMIN', 'DIRECTIVO'].includes(user.role)) {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 max-w-sm w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Acceso Denegado</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Lo sentimos, solo administradores y directivos pueden acceder a esta página.
            </p>
            <a href="/dashboard" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block">
              Volver al Dashboard
            </a>
          </div>
        </div>
      );
    }

    {/* If user is admin or directivo, render the promotion page */}
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Promoción de Estudiantes</h1>
        {/* Aquí puedes agregar el contenido de la página de promoción de estudiantes */}
        {/* Un selector que filtre por ciclo académico  y un input para colocar el nombre del estudiante o dni*/}
        <div className="mb-6">
          <label htmlFor="academicCycle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleccionar Ciclo Académico
          </label>
          <select
            id="academicCycle"
            className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="">Seleccionar ciclo</option>
            {academicCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Buscar Estudiante por Nombre o DNI
          </label>
          <input
            type="text"
            id="studentSearch"
            placeholder="Ingrese nombre o DNI del estudiante"
            className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>

        {/* Aquí puedes agregar una tabla o lista para mostrar los estudiantes filtrados */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Estudiantes Filtrados</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Aquí se mostrarán los estudiantes que coincidan con los criterios de búsqueda.
          </p>
        </div>
      </div>
    );

}
