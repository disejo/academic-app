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

export default function DirectivoDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleClickManageSubjectsClassrooms = async () => {
    setLoading(true);
    await router.push('/admin/subjects-classrooms');
  };
  const handleClickCreateNewUser = async () => {
    setLoading(true);
    await router.push('/admin/users');
  };
  const handleClickManageAcademicCycles = async () => {
    setLoading(true);
    await router.push('/admin/academic-cycles');
  };
  const handleClickManageSubjects = async () => {
    setLoading(true);
    await router.push('/admin/subjects');
  };
  const handleClickManageClassrooms = async () => {
    setLoading(true);
    await router.push('/admin/classrooms');
  };
  const handleClickStudentPromotion = async () => {
    setLoading(true);
    await router.push('/admin/student-promotion');
  };

  const handleClickStudentGrade = async () => {
    setLoading(true);
    await router.push('/directivo/users');
  };

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
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Acciones del Directivo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleClickManageSubjectsClassrooms}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Asignaturas y Aulas'}
          </button>

          <button
            onClick={handleClickCreateNewUser}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-green-800 hover:bg-green-900 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Crear Nuevo Usuario'}
          </button>

          <button
            onClick={handleClickManageAcademicCycles}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Ciclos Académicos'}
          </button>

          <button
            onClick={handleClickManageSubjects}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Asignaturas'}
          </button>

          <button
            onClick={handleClickManageClassrooms}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Gestionar Aulas'}
          </button>

          <button
            onClick={handleClickStudentPromotion}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Promoción de Estudiantes'}
          </button>
          <button
            onClick={handleClickStudentGrade}
            disabled={loading}
            className="block items-center justify-center cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300 text-center"
          >
            {loading ? 'Cargando...' : 'Nota por Estudiante'}
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
