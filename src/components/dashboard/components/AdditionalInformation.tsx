'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Director {
  id: string;
  name: string;
}

interface StudentGrade {
  studentId: string;
  grade: number;
  subject: string;
  classroomId: string; 
  timestamp?: any; 
  updatedBy?: string; 
}

export function AdditionalInformation(){
    const [directors, setDirectors] = useState<Director[]>([]);
    const [lastGradeUpdate, setLastGradeUpdate] = useState<StudentGrade | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const gradesSnapshot = await getDocs(collection(db, 'grades'));
                const fetchedGrades: StudentGrade[] = gradesSnapshot.docs.map(doc => doc.data() as StudentGrade);

                const directorsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'DIRECTIVO')));
                setDirectors(directorsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));

                if (fetchedGrades.length > 0) {
                  const latestGrade = fetchedGrades.sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0))[0];
                  setLastGradeUpdate(latestGrade);
                }
            } catch (err: any) {
                console.error("Error fetching dashboard data:", err);
                setError("Error al cargar los datos del tablero.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <p>Cargando...</p>;
    if (error) return <p>Error: {error}</p>;

    return(
        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Información Adicional</h2>
          <div className="text-gray-600 dark:text-gray-300">
            <p className="mb-2">
              <span className="font-semibold">Directivos:</span> 
              {directors.length > 0 ? directors.map(d => d.name).join(", ") : "N/A"}
            </p>
            <p>
              <span className="font-semibold">Última Actualización de Notas:</span> 
              {lastGradeUpdate ? (
                `El ${lastGradeUpdate.timestamp?.toDate().toLocaleString()} por ${lastGradeUpdate.updatedBy || 'Desconocido'}`
              ) : (
                "N/A"
              )}
            </p>
          </div>
        </div>
    )
}