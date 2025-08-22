/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import Icon from '@mdi/react';
import { mdiBullseyeArrow } from '@mdi/js';

interface ClassroomData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
  titularId?: string;
}

interface StudentGrade {
  studentId: string;
  grade: number;
  subjectId: string;
  updatedAt?: any;
}

const COLORS = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#FF0000'];

export function SubjectPerformance() {
  const [availableClassrooms, setAvailableClassrooms] = useState<ClassroomData[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [availableSubjectsForClassroom, setAvailableSubjectsForClassroom] = useState<SubjectData[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvedDisapprovedData, setApprovedDisapprovedData] = useState<any[]>([]);
  const [performanceOverTimeData, setPerformanceOverTimeData] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [titularTeacher, setTitularTeacher] = useState<string>('');

  useEffect(() => {
    const fetchClassrooms = async () => {
      setLoading(true);
      try {
        const classroomsSnapshot = await getDocs(collection(db, 'classrooms'));
        const classroomsList = classroomsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          name: doc.data().name 
        }));
        setAvailableClassrooms(classroomsList);
      } catch (err) {
        console.error("Error fetching classrooms:", err);
        setError("Error al cargar las aulas.");
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, []);

  useEffect(() => {
    // Clear subjects and reset selection when classroom changes
    setAvailableSubjectsForClassroom([]);
    setSelectedSubject('');

    if (!selectedClassroom) return;

    const fetchSubjectsForClassroom = async () => {
      setLoadingSubjects(true);
      try {
        // This query gets the relationships from the 'classroom_subjects' collection
        const classroomSubjectsQuery = query(
          collection(db, 'classroom_subjects'), 
          where('classroomId', '==', selectedClassroom)
        );
        const classroomSubjectsSnapshot = await getDocs(classroomSubjectsQuery);
        const subjectIds = classroomSubjectsSnapshot.docs.map(doc => doc.data().subjectId);

        // For each subjectId found, we get the actual subject data from the 'subjects' collection
        const subjectsData = [];
        for (const subjectId of subjectIds) {
          const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
          if (subjectDoc.exists()) {
            subjectsData.push({
              id: subjectDoc.id,
              name: subjectDoc.data().name,
              titularId: subjectDoc.data().titularId
            });
          }
        }
        setAvailableSubjectsForClassroom(subjectsData);

      } catch (err) {
        console.error("Error fetching subjects for classroom:", err);
        setError("Error al cargar las asignaturas para el aula seleccionada.");
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjectsForClassroom();
  }, [selectedClassroom]);

  useEffect(() => {
    const fetchTitularTeacher = async () => {
      if (selectedSubject) {
        const subject = availableSubjectsForClassroom.find(s => s.id === selectedSubject);
        if (subject && subject.titularId) {
          try {
            const teacherDoc = await getDoc(doc(db, 'users', subject.titularId));
            if (teacherDoc.exists()) {
              setTitularTeacher(teacherDoc.data().name || 'Nombre no encontrado');
            } else {
              setTitularTeacher('Docente no encontrado');
            }
          } catch (error) {
            console.error('Error fetching teacher:', error);
            setTitularTeacher('Error al cargar docente');
          }
        } else {
          setTitularTeacher('No asignado');
        }
      } else {
        setTitularTeacher('');
      }
    };
    fetchTitularTeacher();
  }, [selectedSubject, availableSubjectsForClassroom]);

  useEffect(() => {
    if (!selectedClassroom || !selectedSubject) {
      setApprovedDisapprovedData([]);
      setPerformanceOverTimeData([]);
      setStudentCount(0);
      return;
    }

    const fetchChartData = async () => {
      setLoadingCharts(true);
      try {
        // 1. Get student IDs for the selected classroom
        const enrollmentsQuery = query(
          collection(db, 'classroom_enrollments'),
          where('classroomId', '==', selectedClassroom)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const classroomStudentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
        setStudentCount(classroomStudentIds.length);

        if (classroomStudentIds.length === 0) {
          setApprovedDisapprovedData([]);
          setPerformanceOverTimeData([]);
          setLoadingCharts(false);
          return;
        }

        // 2. Get all grades for the selected subject
        const gradesQuery = query(
          collection(db, 'grades'),
          where('subjectId', '==', selectedSubject)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const allSubjectGrades = gradesSnapshot.docs.map(doc => doc.data() as StudentGrade);

        // 3. Filter grades to include only students from the selected classroom
        const gradesForSelectedClassroomAndSubject = allSubjectGrades.filter(grade => 
          classroomStudentIds.includes(grade.studentId)
        );

        let approved = 0;
        let disapproved = 0;
        const studentIdsWithGrades = [...new Set(gradesForSelectedClassroomAndSubject.map(g => g.studentId))];
        
        studentIdsWithGrades.forEach(studentId => {
          const studentGrades = gradesForSelectedClassroomAndSubject.filter(g => g.studentId === studentId);
          if (studentGrades.length > 0) {
            const average = studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length;
            if (average >= 7) {
              approved++;
            } else {
              disapproved++;
            }
          }
        });

        const notGraded = classroomStudentIds.length - studentIdsWithGrades.length;

        setApprovedDisapprovedData([
          { name: 'Aprobados', value: approved },
          { name: 'Desaprobados', value: disapproved },
          { name: 'No Calificados', value: notGraded > 0 ? notGraded : 0 }
        ]);

        const performanceByMonth: { name: string; average: number; }[] = [];
        const gradesByMonth = new Map<string, number[]>();
        gradesForSelectedClassroomAndSubject.forEach(grade => {
          if (grade.updatedAt) {
            const month = new Date(grade.updatedAt.toDate()).toLocaleString('es-ES', { month: 'short', year: 'numeric' });
            if (!gradesByMonth.has(month)) {
              gradesByMonth.set(month, []);
            }
            gradesByMonth.get(month)?.push(grade.grade);
          }
        });
        const sortedMonths = Array.from(gradesByMonth.keys()).sort((a, b) => {
          const [monthA, yearA] = a.split(' ');
          const [monthB, yearB] = b.split(' ');
          const dateA = new Date(`${monthA} 1, ${yearA}`);
          const dateB = new Date(`${monthB} 1, ${yearB}`);
          return dateA.getTime() - dateB.getTime();
        });
        sortedMonths.forEach(month => {
          const grades = gradesByMonth.get(month) || [];
          if (grades.length > 0) {
            const average = grades.reduce((sum, g) => sum + g, 0) / grades.length;
            performanceByMonth.push({ name: month, average: parseFloat(average.toFixed(2)) });
          }
        });
        setPerformanceOverTimeData(performanceByMonth);

      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError("Error al cargar los datos de los gráficos.");
      } finally {
        setLoadingCharts(false);
      }
    };

    fetchChartData();
  }, [selectedClassroom, selectedSubject]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4 mb-8">
        <div className="flex items-center">
          <div className="text-red-500 dark:text-red-400 font-medium">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Rendimiento por Asignatura</h2>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="classroom-select" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
            Seleccionar Aula:
          </label>
          <select
            id="classroom-select"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
          >
            <option value="">Seleccione un aula</option>
            {availableClassrooms.map(classroom => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="subject-select" className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
            Seleccionar Asignatura:
          </label>
          <select
            id="subject-select"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:dark:bg-gray-700 disabled:cursor-not-allowed"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={!selectedClassroom || loadingSubjects}
          >
            <option value="">
              {loadingSubjects 
                ? 'Cargando...' 
                : availableSubjectsForClassroom.length === 0 && selectedClassroom
                ? 'No hay asignaturas'
                : 'Seleccione una asignatura'}
            </option>
            {availableSubjectsForClassroom.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingCharts ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">Cargando...</div>
          </div>
        </div>
      ) : selectedClassroom && selectedSubject ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Approved/Disapproved Pie Chart */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Alumnos Aprobados/Desaprobados
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <p className="font-semibold">{availableClassrooms.find(c => c.id === selectedClassroom)?.name} - {availableSubjectsForClassroom.find(s => s.id === selectedSubject)?.name}</p>
              <p>Docente Titular: <span className="font-medium">{titularTeacher || 'Cargando...'}</span></p>
              <p>Total de Alumnos: <span className="font-medium">{studentCount}</span></p>
            </div>
            
            {approvedDisapprovedData.reduce((acc, entry) => acc + entry.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={approvedDisapprovedData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    <Cell key={`cell-0`} fill={COLORS[3]} /> {/* Aprobados - green */}
                    <Cell key={`cell-1`} fill={COLORS[1]} /> {/* Desaprobados - orange */}
                    <Cell key={`cell-2`} fill={COLORS[2]} /> {/* No Calificados - yellow */}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} itemStyle={{ color: '#fff' }}/>
                  <Legend wrapperStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Over Time Line Chart */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Rendimiento a lo largo del Año
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {availableSubjectsForClassroom.find(s => s.id === selectedSubject)?.name}
            </div>
            
            {performanceOverTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={performanceOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ccc" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#ccc" 
                    fontSize={12}
                    domain={[0, 10]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#333',
                      border: '1px solid #555',
                      borderRadius: '4px'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#82ca9d" 
                    strokeWidth={3}
                    activeDot={{ r: 6, fill: '#82ca9d' }}
                    name="Promedio"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p>No hay datos de rendimiento disponibles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center mb-4"><Icon path={mdiBullseyeArrow} size={3} /></div>
          <p className="text-lg">Seleccione un aula y una asignatura para ver el rendimiento</p>
        </div>
      )}
    </div>
  );
}
