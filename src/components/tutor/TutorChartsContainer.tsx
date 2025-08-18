'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import StudentGradesChart from './components/StudentGradesChart';

interface Student {
  studentId: string;
  studentName: string;
}

const TutorChartsContainer = () => {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      if (user) {
        try {
          // Buscar en la colección 'users' todos los estudiantes asociados con el UID de este tutor
          const studentsQuery = query(
            collection(db, 'users'), 
            where('tutorId', '==', user.uid),
            where('role', '==', 'ESTUDIANTE')
          );
          
          const querySnapshot = await getDocs(studentsQuery);
          
          const fetchedStudents = querySnapshot.docs.map(doc => ({
            studentId: doc.id,
            studentName: doc.data().name || 'Nombre no encontrado'
          }));

          setStudents(fetchedStudents);

        } catch (error) {
          console.error("Error obteniendo los estudiantes del tutor:", error);
        }
      }
      setLoading(false);
    };

    if (!authLoading) {
      fetchStudents();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="p-4 rounded-lg shadow-md w-full h-[400px] flex justify-center items-center">
        <div className="flex justify-center items-center py-12">
           <span className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center p-8">Inicia sesión para ver esta página.</div>;
  }
  
  if (students.length === 0) {
    return <div className="text-center p-8 bg-gray-100 rounded-lg">No tienes estudiantes asignados.</div>;
  }

  return (
    <section className="w-ful">
        <h2 className="text-2xl font-bold mb-6 mt-8 text-gray-800 dark:text-gray-200 p-2">Notas por trimestre</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
            {students.map(student => (
                <StudentGradesChart key={student.studentId} studentId={student.studentId} studentName={student.studentName} />
            ))}
        </div>
    </section>
  );
};

export default TutorChartsContainer;
