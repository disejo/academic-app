/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, where,query, orderBy, type QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AcademicCycle {
  id: string;
  name: string;
}

interface StudentRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentDni?: string;
  classroomId: string;
  classroomName: string;
}

interface StudyYearOption {
  value: string;
  label: string;
}

const DEFAULT_STUDY_YEAR_OPTIONS: StudyYearOption[] = [
  { value: '', label: 'Todos los años' },
];

function getStudyYearLabel(value: string): string {
  switch (value) {
    case '1':
      return '1er Año';
    case '2':
      return '2do Año';
    case '3':
      return '3er Año';
    case '4':
      return '4to Año';
    case '5':
      return '5to Año';
    case '6':
      return '6to Año';
    default:
      return `${value} Año`;
  }
}

function parseStudyYearFromClassroomName(classroomName: string): string {
  const normalized = classroomName.toLowerCase();
  const map: Record<string, string> = {
    primero: '1',
    primer: '1',
    '1er': '1',
    segundo: '2',
    '2do': '2',
    tercero: '3',
    tercer: '3',
    '3er': '3',
    cuarto: '4',
    '4to': '4',
    quinto: '5',
    '5to': '5',
    sexto: '6',
    '6to': '6',
  };

  for (const key of Object.keys(map)) {
    if (normalized.includes(key)) {
      return map[key];
    }
  }

  const numericMatch = normalized.match(/\b([1-6])(?:er|ro|to|º|°)?\b/);
  return numericMatch ? numericMatch[1] : '';
}

function chunkArray<T>(array: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function useSelectedStudent(selectedStudentId: string | null) {
  useEffect(() => {
    if (selectedStudentId) {
      // Reemplaza esto con tu hook real si necesitas enviar el id del estudiante.
      console.log('Selected student ID for promotion:', selectedStudentId);
    }
  }, [selectedStudentId]);
}

export default function StudentPromotionPage() {
  const { user, loading: authLoading } = useAuth();
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedStudyYear, setSelectedStudyYear] = useState('');
  const [studyYearOptions, setStudyYearOptions] = useState<StudyYearOption[]>(DEFAULT_STUDY_YEAR_OPTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState<StudentRow[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAcademicCycles = async () => {
      try {
        const cyclesSnapshot = await getDocs(collection(db, 'academicCycles'));
        const cyclesData = cyclesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AcademicCycle));
        setAcademicCycles(cyclesData);
      } catch (error) {
        console.error('Error fetching academic cycles:', error);
      }
    };

    fetchAcademicCycles();
  }, []);

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      if (!selectedCycleId) {
        setEnrolledStudents([]);
        setFilteredStudents([]);
        setStudyYearOptions(DEFAULT_STUDY_YEAR_OPTIONS);
        setSelectedStudyYear('');
        setStudentsError(null);
        return;
      }

      setLoadingStudents(true);
      setStudentsError(null);

      try {
        const enrollmentsQuery = query(
          collection(db, 'classroom_enrollments'),
          where('academicCycleId', '==', selectedCycleId)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrollments = enrollmentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

        const classroomIds = Array.from(
          new Set(enrollments.map((enrollment) => enrollment.classroomId).filter(Boolean))
        );

        const classroomNames = new Map<string, string>();
        const chunks = chunkArray(classroomIds, 10);

        for (const chunk of chunks) {
          const classroomsQuery = query(collection(db, 'classrooms'), where('__name__', 'in', chunk));
          const classroomsSnapshot = await getDocs(classroomsQuery);
          classroomsSnapshot.forEach((doc) => {
            const data = doc.data();
            classroomNames.set(doc.id, data.name || '');
          });
        }

        const studentIds = Array.from(
          new Set(enrollments.map((enrollment) => enrollment.studentId).filter(Boolean))
        );
        const studentDataMap = new Map<string, { name?: string; dni?: string }>();
        const studentChunks = chunkArray(studentIds, 10);

        for (const chunk of studentChunks) {
          const usersQuery = query(collection(db, 'users'), where('__name__', 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc) => {
            const data = doc.data();
            studentDataMap.set(doc.id, {
              name: data.name || '',
              dni: data.dni || '',
            });
          });
        }

        const rows: StudentRow[] = enrollments.map((enrollment) => {
          const studentData = studentDataMap.get(enrollment.studentId) || {};
          return {
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            studentName: enrollment.studentName || studentData.name || '',
            studentDni: studentData.dni || enrollment.dni || enrollment.studentDni || '',
            classroomId: enrollment.classroomId,
            classroomName: classroomNames.get(enrollment.classroomId) || '',
          };
        });

        const uniqueYears = Array.from(
          new Set(rows.map((row) => parseStudyYearFromClassroomName(row.classroomName)).filter(Boolean))
        ).sort((a, b) => Number(a) - Number(b));

        const yearOptions: StudyYearOption[] = [
          ...DEFAULT_STUDY_YEAR_OPTIONS,
          ...uniqueYears.map((year) => ({ value: year, label: getStudyYearLabel(year) })),
        ];

        setEnrolledStudents(rows);
        setStudyYearOptions(yearOptions);
        if (!yearOptions.some((option) => option.value === selectedStudyYear)) {
          setSelectedStudyYear('');
        }
        setSelectedStudentId(null);
      } catch (error) {
        console.error('Error fetching enrolled students:', error);
        setStudentsError('No se pudieron cargar los estudiantes inscritos. Intenta nuevamente.');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchEnrolledStudents();
  }, [selectedCycleId]);

  useEffect(() => {
    const filtered = enrolledStudents.filter((student) => {
      const matchesYear = selectedStudyYear
        ? parseStudyYearFromClassroomName(student.classroomName) === selectedStudyYear
        : true;

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = term
        ? student.studentName.toLowerCase().includes(term) || (student.studentDni?.toLowerCase().includes(term) ?? false)
        : true;

      return matchesYear && matchesSearch;
    });

    setFilteredStudents(filtered);
  }, [selectedStudyYear, searchTerm, enrolledStudents]);

  useEffect(() => {
    if (selectedStudentId && !filteredStudents.some((student) => student.studentId === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent = useMemo(
    () => filteredStudents.find((student) => student.studentId === selectedStudentId) ?? null,
    [filteredStudents, selectedStudentId]
  );

  useSelectedStudent(selectedStudentId);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId((current) => (current === studentId ? null : studentId));
  };

  

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !user.role || !['ADMIN', 'DIRECTIVO', 'PRECEPTOR'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Acceso Denegado</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Lo sentimos, solo administradores y directivos pueden acceder a esta página.
          </p>
          <a href="/dashboard" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block">
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Promoción de Estudiantes</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Selecciona el ciclo lectivo, el año de estudio y luego marca los estudiantes para enviarlos al hook.
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label htmlFor="academicCycle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ciclo Académico
              </label>
              <select
                id="academicCycle"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 rounded-md"
              >
                <option value="">Seleccionar ciclo</option>
                {academicCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="studyYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Año de Estudio
              </label>
              <select
                id="studyYear"
                value={selectedStudyYear}
                onChange={(e) => setSelectedStudyYear(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 rounded-md"
                disabled={!selectedCycleId}
              >
                {studyYearOptions.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar Nombre o DNI
              </label>
              <input
                type="text"
                id="studentSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o DNI"
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Estudiantes Filtrados</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{filteredStudents.length} estudiante(s) encontrados.</p>
            </div>
          </div>

          {loadingStudents ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : studentsError ? (
            <p className="text-red-500">{studentsError}</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-300">No se encontraron estudiantes para los filtros seleccionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="p-3 border border-gray-200 dark:border-gray-700">Nombre</th>
                    <th className="p-3 border border-gray-200 dark:border-gray-700">DNI</th>
                    <th className="p-3 border border-gray-200 dark:border-gray-700">Aula</th>
                    <th className="p-3 border border-gray-200 dark:border-gray-700">Año</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.enrollmentId} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800">
                      <td className="p-3 border border-gray-200 dark:border-gray-700">
                        <Link
                          href={`/admin/student-promotion/student-analitic?studentId=${encodeURIComponent(student.studentId)}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {student.studentName || 'Sin nombre'}
                        </Link>
                      </td>
                      <td className="p-3 border border-gray-200 dark:border-gray-700">{student.studentDni || '-'}</td>
                      <td className="p-3 border border-gray-200 dark:border-gray-700">{student.classroomName || 'Desconocida'}</td>
                      <td className="p-3 border border-gray-200 dark:border-gray-700">{parseStudyYearFromClassroomName(student.classroomName) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
