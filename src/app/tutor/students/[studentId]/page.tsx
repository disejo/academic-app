'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  email: string;
  dni: string;
}

export default function StudentProgressPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchStudent = async () => {
      setLoading(true);
      try {
        const studentRef = doc(db, 'users', studentId);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          setStudent({ id: studentSnap.id, ...studentSnap.data() } as Student);
        } else {
          setError('Student not found.');
        }
      } catch (err: any) {
        console.error("Error fetching student data:", err);
        setError('Failed to load student data.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  if (loading) {
    return <div className="text-center p-10 text-gray-900 dark:text-gray-100">Cargando progreso del estudiante...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  }

  if (!student) {
    return <div className="text-center p-10 text-gray-900 dark:text-gray-100">Estudiante no encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">&larr; Volver al Dashboard</Link>
        <h1 className="text-3xl font-bold mt-2">Progreso Académico de {student.name}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">DNI: {student.dni} | Email: {student.email}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold mb-4">Notas por Asignatura y Trimestre</h2>
        <p className="text-gray-500 dark:text-gray-400">Aquí se mostrarán las notas del estudiante por asignatura y trimestre.</p>
        {/* Placeholder for grades table/charts */}
        <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500 dark:text-gray-400">
          [Tabla/Gráficos de Notas]
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Historial de Clases y Ciclos</h2>
        <p className="text-gray-500 dark:text-gray-400">Aquí se mostrará el historial de clases y ciclos lectivos del estudiante.</p>
        {/* Placeholder for class history */}
        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500 dark:text-gray-400">
          [Historial de Clases]
        </div>
      </div>
    </div>
  );
}
