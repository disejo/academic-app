'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// NOTE: To enable charting, you must install recharts.
// Run the following command in your terminal:
// npm install recharts
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface CardProps {
  title: string;
  value: string | number;
  description: string;
}

interface StudentGrade {
  studentId: string;
  grade: number;
  subject: string;
  classroomId: string; // Assuming grades are linked to classrooms
  timestamp?: any; // Assuming a timestamp field
  updatedBy?: string; // Assuming a user ID field for who updated
}

interface StudentData {
  id: string;
  name: string;
  averageGrade: number;
  academicCycleId?: string; // Assuming students are linked to academic cycles
}

interface Director {
  id: string;
  name: string;
}

interface SubjectPerformance {
  subject: string;
  average: number;
}

interface ClassroomData {
  id: string;
  name: string;
}

interface AcademicCycle {
  id: string;
  name: string;
  isActive: boolean; // Assuming a field to denote active cycle
}

const StatCard: React.FC<CardProps> = ({ title, value, description }) => (
  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md flex-1 min-w-[200px]">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-300">{description}</p>
  </div>
);

const COLORS = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#FF0000']; // Colors for pie chart

export default function DocenteDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClassrooms, setTotalClassrooms] = useState(0);
  const [bestStudent, setBestStudent] = useState<StudentData | null>(null);
  const [topStudents, setTopStudents] = useState<StudentData[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [lastGradeUpdate, setLastGradeUpdate] = useState<StudentGrade | null>(null);
  const [allGrades, setAllGrades] = useState<StudentGrade[]>([]);
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<ClassroomData[]>([]);

  const [availableClassrooms, setAvailableClassrooms] = useState<ClassroomData[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [availableSubjectsForClassroom, setAvailableSubjectsForClassroom] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const [approvedDisapprovedData, setApprovedDisapprovedData] = useState<any[]>([]);
  const [performanceOverTimeData, setPerformanceOverTimeData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Academic Cycles and identify active one
        const academicCyclesSnapshot = await getDocs(collection(db, 'academic-cycles'));
        const activeCycle = academicCyclesSnapshot.docs.find(doc => doc.data().isActive === true);
        const activeCycleId = activeCycle ? activeCycle.id : null;

        // Fetch Students (filtered by active academic cycle)
        let studentsQuery = query(collection(db, 'users'), where('role', '==', 'ESTUDIANTE'));
        if (activeCycleId) {
          studentsQuery = query(studentsQuery, where('academicCycleId', '==', activeCycleId));
        }
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, academicCycleId: doc.data().academicCycleId }));
        setAllStudents(studentsList);
        setTotalStudents(studentsList.length);

        // Fetch Classrooms
        const classroomsSnapshot = await getDocs(collection(db, 'classrooms'));
        const classroomsList = classroomsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setAllClassrooms(classroomsList);
        setAvailableClassrooms(classroomsList);
        setTotalClassrooms(classroomsSnapshot.size);

        // Fetch Directors
        const directorsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'DIRECTIVO')));
        setDirectors(directorsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));

        // Fetch Grades
        const gradesSnapshot = await getDocs(collection(db, 'grades'));
        const fetchedGrades: StudentGrade[] = gradesSnapshot.docs.map(doc => doc.data() as StudentGrade);
        setAllGrades(fetchedGrades);

        // Calculate Last Grade Update
        if (fetchedGrades.length > 0) {
          const latestGrade = fetchedGrades.sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0))[0];
          setLastGradeUpdate(latestGrade);
        }

        // Calculate Averages for Best Student and Top 5
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
          setTopStudents(studentsWithAverages.slice(0, 5));
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

  // Effect to update available subjects when classroom changes
  useEffect(() => {
    if (selectedClassroom && allGrades.length > 0) {
      const subjectsInSelectedClassroom = [...new Set(allGrades
        .filter(grade => grade.classroomId === selectedClassroom)
        .map(grade => grade.subject)
      )];
      setAvailableSubjectsForClassroom(subjectsInSelectedClassroom);
      if (subjectsInSelectedClassroom.length > 0) {
        setSelectedSubject(subjectsInSelectedClassroom[0]);
      } else {
        setSelectedSubject('');
      }
    } else {
      setAvailableSubjectsForClassroom([]);
      setSelectedSubject('');
    }
  }, [selectedClassroom, allGrades]);

  // Effect to update chart data when subject or classroom changes
  useEffect(() => {
    if (!selectedClassroom || !selectedSubject || allGrades.length === 0 || allStudents.length === 0) {
      setApprovedDisapprovedData([]);
      setPerformanceOverTimeData([]);
      return;
    }

    const gradesForSelectedClassroomAndSubject = allGrades.filter(
      grade => grade.classroomId === selectedClassroom && grade.subject === selectedSubject
    );

    // Data for Approved/Disapproved Pie Chart
    let approved = 0;
    let disapproved = 0;

    const studentIdsInClassroomAndSubject = [...new Set(gradesForSelectedClassroomAndSubject.map(g => g.studentId))];

    studentIdsInClassroomAndSubject.forEach(studentId => {
      const studentGrades = gradesForSelectedClassroomAndSubject.filter(g => g.studentId === studentId);
      const average = studentGrades.length > 0 ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length : 0;
      if (average >= 7) { // Assuming 7 is the passing grade
        approved++;
      } else if (studentGrades.length > 0) {
        disapproved++;
      }
    });

    setApprovedDisapprovedData([
      { name: 'Aprobados', value: approved },
      { name: 'Desaprobados', value: disapproved }
    ]);

    // Data for Performance Over the Year Line Chart
    const performanceByMonth: { name: string; average: number; }[] = [];
    const gradesByMonth = new Map<string, number[]>();

    gradesForSelectedClassroomAndSubject.forEach(grade => {
      if (grade.timestamp) {
        const month = new Date(grade.timestamp.toDate()).toLocaleString('es-ES', { month: 'short', year: 'numeric' });
        if (!gradesByMonth.has(month)) {
          gradesByMonth.set(month, []);
        }
        gradesByMonth.get(month)?.push(grade.grade);
      }
    });

    const sortedMonths = Array.from(gradesByMonth.keys()).sort((a, b) => {
      const dateA = new Date(a.replace('.', '').replace(' ', ' 1, '));
      const dateB = new Date(b.replace('.', '').replace(' ', ' 1, '));
      return dateA.getTime() - dateB.getTime();
    });

    sortedMonths.forEach(month => {
      const grades = gradesByMonth.get(month) || [];
      const average = grades.length > 0 ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 0;
      performanceByMonth.push({ name: month, average: parseFloat(average.toFixed(2)) });
    });

    setPerformanceOverTimeData(performanceByMonth);

  }, [selectedClassroom, selectedSubject, allGrades, allStudents]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-800 text-gray-100">
        Cargando datos del tablero...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-800 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-center">Panel de Docente</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total de Estudiantes"
          value={totalStudents}
          description="Número total de estudiantes registrados en el ciclo activo."
        />
        <StatCard 
          title="Total de Aulas"
          value={totalClassrooms}
          description="Número total de aulas disponibles."
        />
        <StatCard 
          title="Mejor Promedio"
          value={bestStudent ? `${bestStudent.name} (${bestStudent.averageGrade})` : "N/A"}
          description="Estudiante con el promedio más alto."
        />
      </div>

      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Acciones del Docente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/docente/grades" className="block">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300">
              Ingresar Calificaciones
            </button>
          </Link>
          <Link href="/docente/programs" className="block">
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition duration-300">
              Gestionar Programas
            </button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Top 5 Estudiantes</h2>
        {topStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Nombre</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Promedio</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                {topStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.averageGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">No hay datos de estudiantes para mostrar el top 5.</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Rendimiento por Asignatura</h2>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="classroom-select" className="block text-sm font-bold mb-2 dark:text-gray-300">Seleccionar Aula:</label>
            <select
              id="classroom-select"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
            >
              <option value="">Seleccione un aula</option>
              {availableClassrooms.length > 0 ? (
                availableClassrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                ))
              ) : (
                <option value="" disabled>No hay aulas disponibles</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="subject-select" className="block text-sm font-bold mb-2 dark:text-gray-300">Seleccionar Asignatura:</label>
            <select
              id="subject-select"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClassroom || availableSubjectsForClassroom.length === 0}
            >
              <option value="">Seleccione una asignatura</option>
              {availableSubjectsForClassroom.length > 0 ? (
                availableSubjectsForClassroom.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))
              ) : (
                <option value="" disabled>No hay asignaturas disponibles para esta aula</option>
              )}
            </select>
          </div>
        </div>

        {selectedClassroom && selectedSubject ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Approved/Disapproved Pie Chart */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Alumnos Aprobados/Desaprobados en {allClassrooms.find(c => c.id === selectedClassroom)?.name} - {selectedSubject}</h3>
              {approvedDisapprovedData.length === 2 && (approvedDisapprovedData[0].value > 0 || approvedDisapprovedData[1].value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={approvedDisapprovedData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell key={`cell-0`} fill={COLORS[0]} /> {/* Approved */}
                      <Cell key={`cell-1`} fill={COLORS[1]} /> {/* Disapproved */}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">No hay datos de aprobados/desaprobados para esta aula y asignatura.</p>
              )}
            </div>

            {/* Performance Over the Year Line Chart */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Rendimiento a lo largo del Año en {selectedSubject}</h3>
              {performanceOverTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#82ca9d" activeDot={{ r: 8 }} name="Promedio" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">No hay datos de rendimiento a lo largo del año para esta asignatura.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">Seleccione un aula y una asignatura para ver el rendimiento.</p>
        )}
      </div>

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
    </div>
  );
}