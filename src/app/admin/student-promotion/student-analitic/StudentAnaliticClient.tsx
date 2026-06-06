"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { StudentAnalytics } from '@/modules/analytics';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StudentAnaliticClient() {
  const { user, loading: authLoading } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [loadedStudentId, setLoadedStudentId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams?.get('studentId');
    if (id) {
      setStudentId(id);
      setLoadedStudentId(id);
    }
  }, [searchParams]);

  const [studentData, setStudentData] = useState<{ name?: string; dni?: string; email?: string } | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  useEffect(() => {
    if (!loadedStudentId) return;
    setLoadingStudent(true);

    const fetchUser = async () => {
      try {
        const ref = doc(db, 'users', loadedStudentId);
        const snap = await getDoc(ref);
        if (snap.exists()) setStudentData(snap.data() as any);
        else setStudentData(null);
      } catch (err) {
        console.error('Error fetching student data', err);
        setStudentData(null);
      } finally {
        setLoadingStudent(false);
      }
    };

    fetchUser();
  }, [loadedStudentId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !user.role || !['ADMIN', 'DIRECTIVO', 'PRECEPTOR', 'DOCENTE'].includes(user.role)) {
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold mb-2">Analítico por Estudiante</h1>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {loadingStudent ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">Cargando datos del estudiante...</p>
              ) : studentData ? (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div className="font-semibold">{studentData.name || 'Nombre no disponible'}</div>
                  <div className="text-xs">DNI: {studentData.dni || '-'}</div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">ID: {studentId || '—'}</p>
              )}
            </div>

            <div>
              <Link href="/admin/student-promotion" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm text-gray-800 dark:text-white">
                🡄 Volver a Promociones
              </Link>
            </div>
          </div>
        </div>

        {loadedStudentId && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
            <StudentAnalytics studentId={loadedStudentId} />
          </div>
        )}
      </div>
    </div>
  );
}
