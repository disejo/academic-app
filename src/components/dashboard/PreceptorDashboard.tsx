/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';

import TopTenStudents from './components/TopTenStudents';
import {SubjectPerformance} from './components/SubjectPerformance';
import {AdditionalInformation} from './components/AdditionalInformation';
import TotalStudents from './components/TotalStudents';
import BetterAverage from './components/BetterAverage';

import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '../LoadingSpinner';

export default function PreceptorDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleClickManageSubjectsClassrooms = async () => {
    setLoading(true);
    await router.push('/admin/subjects-classrooms');
  };
  const handleClickViewGrades = async () => {
    setLoading(true);
    await router.push('/preceptor/grades');
  };
  const handleClickManageClassrooms = async () => {
    setLoading(true);
    await router.push('/preceptor/classrooms');
  };
  const handleClickCreateStudent = async () => {
    setLoading(true);
    await router.push('/preceptor/students/create');
  };

  const handleClickManageSubjects = async () => {
    setLoading(true);
    await router.push('/admin/subjects');
  };

  const handleClickEstudentGrades = async () => {
    setLoading(true);
    await router.push('/directivo/users');
  }

 const handleClickEstudentTutor = async () => {
    setLoading(true);
    await router.push('/preceptor/students/tutor');
  }

  const handleClickCycles = async () => {
    setLoading(true);
    await router.push('/admin/academic-cycles');
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
        <TotalStudents />
        <BetterAverage />
      </div>
      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Acciones del Preceptor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleClickManageSubjectsClassrooms}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Asignaturas y Aulas'}
          </button>

          <button
            onClick={handleClickViewGrades}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-red-800 hover:bg-red-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Libretas de calificaciones'}
          </button>

          <button
            onClick={handleClickManageClassrooms}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-green-800 hover:bg-green-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Aulas y Estudiantes'}
          </button>

          <button
            onClick={handleClickCreateStudent}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Crear Nuevo Estudiante'}
          </button>
          <button
            onClick={handleClickManageSubjects}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Crear | Asignar Docentes a Asignaturas'}
          </button>
          <button
            onClick={handleClickEstudentGrades}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Ver notas de Estudiante'}
          </button>
          <button
            onClick={handleClickEstudentTutor}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-fuchsia-800 hover:bg-fuchsia-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestion de Tutores y Estudiantes'}
          </button>
          <button
            onClick={handleClickCycles}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestion de Ciclos Academicos'}
          </button>

        </div>
      </div>
      <TopTenStudents />
      <SubjectPerformance />
      <AdditionalInformation />
    </div>
  );
}
