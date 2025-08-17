'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Icon from '@mdi/react';
import { mdiSchoolOutline } from '@mdi/js';

interface CardProps {
  title: string;
  value: string | number;
  description: string;
}

interface StudentGrade {
  studentId: string;
  grade: number;
  subject: string;
  classroomId: string;
  timestamp?: any;
  updatedBy?: string;
}

interface StudentData {
  id: string;
  name: string;
  averageGrade: number;
  academicCycleId?: string;
}

const StatCard: React.FC<CardProps> = ({ title, value, description }) => (
  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md flex-1 min-w-[200px]">
    <div className="flex items-center">
      <Icon path={mdiSchoolOutline} size={1} />
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 ml-2">{title}</h3>
    </div>
    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-300">{description}</p>
  </div>
);

export default function BetterAverage() {
  const [bestStudent, setBestStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBestStudent = async () => {
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
        const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, academicCycleId: doc.data().academicCycleId }));

        const gradesSnapshot = await getDocs(collection(db, 'grades'));
        const fetchedGrades: StudentGrade[] = gradesSnapshot.docs.map(doc => doc.data() as StudentGrade);

        const studentGradesMap = new Map<string, number[]>();
        fetchedGrades.forEach(grade => {
          if (!studentGradesMap.has(grade.studentId)) {
            studentGradesMap.set(grade.studentId, []);
          }
          studentGradesMap.get(grade.studentId)?.push(grade.grade);
        });

        const studentsWithAverages: StudentData[] = studentsList.map(student => {
          const grades = studentGradesMap.get(student.id) || [];
          const averageGrade = grades.length > 0 
            ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length
            : 0;
          return { ...student, averageGrade: parseFloat(averageGrade.toFixed(2)) };
        });

        studentsWithAverages.sort((a, b) => b.averageGrade - a.averageGrade);

        if (studentsWithAverages.length > 0) {
          setBestStudent(studentsWithAverages[0]);
        }
      } catch (err: any) {
        console.error("Error fetching best student:", err);
        setError("Error al cargar el mejor promedio.");
      } finally {
        setLoading(false);
      }
    };

    fetchBestStudent();
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
      title="Mejor Promedio"
      value={bestStudent ? `${bestStudent.name} (${bestStudent.averageGrade})` : "N/A"}
      description="Estudiante con el promedio más alto."
    />
  );
}
