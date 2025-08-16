import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Student {
  id: string;
  name: string;
  dni: string;
  averageGrade: number;
}

interface Grade {
  studentId: string;
  grade: number;
}

const TopTenStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopTenStudents = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const studentsQuery = query(usersCollection, where('role', '==', 'ESTUDIANTE'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          dni: doc.data().dni,
          averageGrade: 0, // Initialize with 0
        })) as Student[];

        const gradesCollection = collection(db, 'grades');
        const gradesSnapshot = await getDocs(gradesCollection);
        const gradesList = gradesSnapshot.docs.map(doc => doc.data() as Grade);

        const studentGradesMap = new Map<string, number[]>();
        gradesList.forEach(grade => {
          if (!studentGradesMap.has(grade.studentId)) {
            studentGradesMap.set(grade.studentId, []);
          }
          studentGradesMap.get(grade.studentId)?.push(grade.grade);
        });

        const studentsWithAverages = studentsList.map(student => {
          const grades = studentGradesMap.get(student.id) || [];
          const averageGrade = grades.length > 0
            ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length
            : 0;
          return { ...student, averageGrade: parseFloat(averageGrade.toFixed(2)) };
        });

        studentsWithAverages.sort((a, b) => b.averageGrade - a.averageGrade);

        setStudents(studentsWithAverages.slice(0, 10));

      } catch (err) {
        setError('Error al obtener los datos de los estudiantes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopTenStudents();
  }, []);

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Top 10 Estudiantes</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b dark:border-gray-700 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Ranking</th>
              <th className="py-2 px-4 border-b dark:border-gray-700 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Nombre</th>
              <th className="py-2 px-4 border-b dark:border-gray-700 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                <td className="py-2 px-4 border-b dark:border-gray-700 text-gray-800 dark:text-gray-300">{index + 1}</td>
                <td className="py-2 px-4 border-b dark:border-gray-700 text-gray-800 dark:text-gray-300">{`${student.name} - (${student.dni})`}</td>
                <td className="py-2 px-4 border-b dark:border-gray-700 text-blue-500 dark:text-blue-400 font-bold">{student.averageGrade.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopTenStudents;
