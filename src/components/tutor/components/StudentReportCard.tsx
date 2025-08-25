'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

// Interfaces
interface Grade {
  id: string;
  subjectId: string;
  grade: number;
  trimester: number;
}

interface AcademicCycle {
  id: string;
  name: string;
  isActive?: boolean;
}

interface StudentReportCardProps {
  studentId: string;
}

// Helper to get grade color
const getGradeColor = (grade: number | null) => {
  if (grade === null) return 'text-gray-500 dark:text-gray-400';
  if (grade >= 7) return 'text-green-600 dark:text-green-400';
  if (grade >= 4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export default function StudentReportCard({ studentId }: StudentReportCardProps) {
  // State Hooks
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect for fetching initial data (cycles and subjects)
  useEffect(() => {
    const fetchCyclesAndSubjects = async () => {
      try {
        const cyclesQuery = query(collection(db, 'academicCycles'));
        const cyclesSnapshot = await getDocs(cyclesQuery);
        const cyclesData = cyclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicCycle));
        setAcademicCycles(cyclesData);
        
        const activeCycle = cyclesData.find(c => c.isActive);
        if (activeCycle) {
          setSelectedCycleId(activeCycle.id);
        } else if (cyclesData.length > 0) {
          setSelectedCycleId(cyclesData[0].id);
        }

        const subjectsQuery = query(collection(db, 'subjects'));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsMap = new Map<string, string>();
        subjectsSnapshot.forEach(doc => subjectsMap.set(doc.id, doc.data().name));
        setSubjects(subjectsMap);

      } catch (err) {
        setError('Error al cargar datos iniciales. Por favor, inténtelo de nuevo más tarde.');
        console.error(err);
      }
    };
    fetchCyclesAndSubjects();
  }, []);

  // Effect for fetching grades when student or cycle changes
  useEffect(() => {
    if (!selectedCycleId || !studentId) return;

    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      try {
        const gradesQuery = query(
          collection(db, 'grades'),
          where('studentId', '==', studentId),
          where('academicCycleId', '==', selectedCycleId)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const gradesData = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
        setGrades(gradesData);
      } catch (err) {
        setError('Error al cargar las calificaciones.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [studentId, selectedCycleId]);

  // Memoized transformation of grades data for rendering
  interface ReportRow {
    subjectName: string;
    [trimester: number]: number | string | null | undefined;
    1?: number | null;
    2?: number | null;
    3?: number | null;
  }

  const reportData: ReportRow[] = useMemo(() => {
    const data: { [subjectName: string]: { [trimester: number]: number | null } } = {};
    grades.forEach(grade => {
      const subjectName = subjects.get(grade.subjectId) || 'Materia Desconocida';
      if (!data[subjectName]) {
        data[subjectName] = { 1: null, 2: null, 3: null };
      }
      data[subjectName][grade.trimester] = grade.grade;
    });
    return Object.entries(data).map(([subjectName, trimesters]) => ({ subjectName, ...trimesters }));
  }, [grades, subjects]);

  // Render Logic
  return (
    <div className="p-4 sm:p-6 bg-gray-200 dark:bg-gray-800 rounded-xl shadow-lg mt-6 transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Boletín de Calificaciones</h3>
        <div className="mt-4 sm:mt-0 w-full sm:w-auto sm:min-w-[250px]">
          <label htmlFor="academic-cycle-select" className="sr-only">Filtrar por Ciclo Lectivo</label>
          <select 
            id="academic-cycle-select"
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="w-full p-3 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            {academicCycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
           <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="text-center py-12 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 font-semibold">¡Oops! Algo salió mal.</p>
          <p className="text-red-500 dark:text-red-500 mt-2">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-700">
            <thead className="bg-gray-300 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Materia</th>
                <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">1er Trim.</th>
                <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">2do Trim.</th>
                <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">3er Trim.</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reportData.length > 0 ? (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-md font-medium text-gray-800 dark:text-gray-200">{row.subjectName}</td>
                    {[1, 2, 3].map(trim => (
                        <td key={trim} className={`px-6 py-4 whitespace-nowrap text-md text-center font-bold ${getGradeColor(row[trim] !== undefined ? (typeof row[trim] === 'number' ? row[trim] : null) : null)}`}>
                            {row[trim] ?? '-'}
                        </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12 px-4 text-gray-500 dark:text-gray-400">
                    <p className="font-semibold">Aún no hay datos</p>
                    <p className="text-sm mt-1">No se encontraron calificaciones para el ciclo lectivo seleccionado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
