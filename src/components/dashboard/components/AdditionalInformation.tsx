/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface Director {
  id: string;
  name: string;
}

interface StudentGrade {
  studentId: string;
  grade: number;
  subject: string;
  classroomId: string; 
  updatedAt?: any; 
  teacherId?: string;
  subjectId?: string;
}

interface RecentGradeDetail extends StudentGrade {
  id: string;
  teacherName: string;
  subjectName: string;
  classroomName: string;
}

export function AdditionalInformation(){
    const { user } = useAuth();
    const [directors, setDirectors] = useState<Director[]>([]);
    const [lastGradeUpdate, setLastGradeUpdate] = useState<StudentGrade | null>(null);
    const [teacherName, setTeacherName] = useState<string | null>(null);
    const [recentGrades, setRecentGrades] = useState<RecentGradeDetail[]>([]);
    const [showRecentGrades, setShowRecentGrades] = useState(false);
    const [gradeLimit, setGradeLimit] = useState(25);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Verificar si el usuario tiene rol autorizado
    const isAuthorizedRole = user?.role && ['ADMIN', 'DIRECTIVO', 'PRECEPTOR'].includes(user.role);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Obtener ciclo lectivo activo
                const academicCyclesSnapshot = await getDocs(collection(db, 'academicCycles'));
                const activeCycle = academicCyclesSnapshot.docs.find(doc => doc.data().isActive === true);
                const activeCycleId = activeCycle ? activeCycle.id : null;

                // Obtener notas filtradas por ciclo activo
                const gradesCollection = collection(db, 'grades');
                const gradesQuery = activeCycleId
                  ? query(gradesCollection, where('academicCycleId', '==', activeCycleId))
                  : gradesCollection;
                const gradesSnapshot = await getDocs(gradesQuery);
                const fetchedGrades: StudentGrade[] = gradesSnapshot.docs.map(doc => doc.data() as StudentGrade);

                const directorsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'DIRECTIVO')));
                setDirectors(directorsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));

                if (fetchedGrades.length > 0) {
                  const sortedGrades = fetchedGrades.sort((a, b) => (b.updatedAt?.toDate().getTime() || 0) - (a.updatedAt?.toDate().getTime() || 0));
                  const latestGrade = sortedGrades[0];
                  setLastGradeUpdate(latestGrade);

                  // Fetch teacher's name if teacherId exists
                  if (latestGrade.teacherId) {
                    const teacherDocRef = doc(db, 'users', latestGrade.teacherId);
                    const teacherDocSnap = await getDoc(teacherDocRef);

                    if (teacherDocSnap.exists() && teacherDocSnap.data().role === 'DOCENTE') {
                      setTeacherName(teacherDocSnap.data().name);
                    } else {
                      setTeacherName('Desconocido');
                    }
                  }

                  // Fetch last N grades with full details (solo si está autorizado)
                  if (isAuthorizedRole) {
                    const lastNGrades = sortedGrades.slice(0, gradeLimit);
                    const detailedGrades: RecentGradeDetail[] = [];

                    // Procesar grades en paralelo para optimizar
                    const gradePromises = lastNGrades.map(async (grade) => {
                      try {
                        let teacherName = 'Desconocido';
                        let subjectName = grade.subject || 'Sin asignatura';
                        let classroomName = 'Sin aula';

                        // Fetch teacher name
                        if (grade.teacherId) {
                          const teacherRef = doc(db, 'users', grade.teacherId);
                          const teacherSnap = await getDoc(teacherRef);
                          if (teacherSnap.exists()) {
                            teacherName = teacherSnap.data().name || 'Desconocido';
                          }
                        }

                        // Fetch subject name
                        if (grade.subjectId) {
                          const subjectRef = doc(db, 'subjects', grade.subjectId);
                          const subjectSnap = await getDoc(subjectRef);
                          if (subjectSnap.exists()) {
                            subjectName = subjectSnap.data().name || subjectName;
                          }
                        }

                        // Fetch classroom name from classroom_subjects relationship
                        if (grade.subjectId) {
                          const classroomSubjectsQuery = query(
                            collection(db, 'classroom_subjects'),
                            where('subjectId', '==', grade.subjectId)
                          );
                          const classroomSubjectsSnap = await getDocs(classroomSubjectsQuery);
                          if (classroomSubjectsSnap.docs.length > 0) {
                            const classroomId = classroomSubjectsSnap.docs[0].data().classroomId;
                            if (classroomId) {
                              const classroomRef = doc(db, 'classrooms', classroomId);
                              const classroomSnap = await getDoc(classroomRef);
                              if (classroomSnap.exists()) {
                                classroomName = classroomSnap.data().name || 'Sin aula';
                              }
                            }
                          }
                        } else if (grade.classroomId) {
                          const classroomRef = doc(db, 'classrooms', grade.classroomId);
                          const classroomSnap = await getDoc(classroomRef);
                          if (classroomSnap.exists()) {
                            classroomName = classroomSnap.data().name || 'Sin aula';
                          }
                        }

                        return {
                          ...grade,
                          id: Math.random().toString(),
                          teacherName,
                          subjectName,
                          classroomName
                        };
                      } catch (err) {
                        console.error("Error fetching grade details:", err);
                        return null;
                      }
                    });

                    const results = await Promise.all(gradePromises);
                    setRecentGrades(results.filter((g): g is RecentGradeDetail => g !== null));
                  }
                }
            } catch (err: any) {
                console.error("Error fetching dashboard data:", err);
                setError("Error al cargar los datos del tablero.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [gradeLimit, isAuthorizedRole]);

    if (loading) return <p>Cargando...</p>;
    if (error) return <p>Error: {error}</p>;

    // No mostrar el componente si el usuario no tiene rol autorizado
    if (!isAuthorizedRole) {
      return null;
    }

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
                `El ${lastGradeUpdate.updatedAt?.toDate().toLocaleString()} por ${teacherName || 'Desconocido'}`
              ) : (
                "N/A"
              )}
            </p>
          </div>

          {/* Botón Toggle para mostrar/ocultar últimas notas */}
          <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setShowRecentGrades(!showRecentGrades)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                {showRecentGrades ? '▼ Ocultar Últimas Notas Cargadas' : '▶ Ver Últimas Notas Cargadas'}
              </button>

              {/* Select para cantidad de notas */}
              {showRecentGrades && (
                <div className="flex items-center gap-2">
                  <label htmlFor="grade-limit" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Mostrar:
                  </label>
                  <select
                    id="grade-limit"
                    value={gradeLimit}
                    onChange={(e) => setGradeLimit(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10 notas</option>
                    <option value={25}>25 notas</option>
                    <option value={50}>50 notas</option>
                    <option value={100}>100 notas</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de últimas notas cargadas */}
          {showRecentGrades && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Docente</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Asignatura</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Aula</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Calificación</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrades.length > 0 ? (
                    recentGrades.map((grade, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}>
                        <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-gray-700 dark:text-gray-300">{grade.teacherName}</td>
                        <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-gray-700 dark:text-gray-300">{grade.subjectName}</td>
                        <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-gray-700 dark:text-gray-300">{grade.classroomName}</td>
                        <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-center font-semibold">
                          <span className={`px-2 py-1 rounded ${
                            grade.grade >= 7 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {grade.grade}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">
                          {grade.updatedAt ? new Date(grade.updatedAt.toDate()).toLocaleString('es-ES') : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                        No hay notas registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
    )
}