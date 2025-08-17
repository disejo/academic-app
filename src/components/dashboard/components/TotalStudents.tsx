'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Icon from '@mdi/react';
import { mdiAccountGroupOutline } from '@mdi/js';

interface CardProps {
  title: string;
  value: string | number;
  description: string;
}

const StatCard: React.FC<CardProps> = ({ title, value, description }) => (
  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md flex-1 min-w-[200px]">
    <div className="flex items-center">
      <Icon path={mdiAccountGroupOutline} size={1} />
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 ml-2">{title}</h3>
    </div>
    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-300">{description}</p>
  </div>
);

export default function TotalStudents() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotalStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const academicCyclesSnapshot = await getDocs(collection(db, 'academic-cycles'));
        const activeCycle = academicCyclesSnapshot.docs.find(doc => doc.data().isActive === true);
        const activeCycleId = activeCycle ? activeCycle.id : null;

        let studentsQuery = query(collection(db, 'users'), where('role', '==', 'ESTUDIANTE'));
        if (activeCycleId) {
          studentsQuery = query(studentsQuery, where('academicCycleId', '==', activeCycleId));
        }
        const studentsSnapshot = await getDocs(studentsQuery);
        setTotalStudents(studentsSnapshot.docs.length);
      } catch (err: any) {
        console.error("Error fetching total students:", err);
        setError("Error al cargar el total de estudiantes.");
      } finally {
        setLoading(false);
      }
    };

    fetchTotalStudents();
  }, []);

  if (loading) {
    return (
        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md flex-1 min-w-[200px]">
            <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-6 rounded-lg shadow-md flex-1 min-w-[200px]">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
            <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
        </div>
    );
  }

  return (
    <StatCard 
      title="Total de Estudiantes"
      value={totalStudents}
      description="Número total de estudiantes registrados en el ciclo activo."
    />
  );
}
