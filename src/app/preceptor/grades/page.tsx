'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Icon from '@mdi/react';
import { mdiFilePdfBox } from '@mdi/js';

interface AcademicCycle {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  dni?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  studentId: string;
  subjectId: string;
  trimester: number;
  grade: number;
}

export default function PreceptorGradesPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const qCycles = query(collection(db, 'academicCycles'));
        const cyclesSnapshot = await getDocs(qCycles);
        const fetchedCycles = cyclesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as AcademicCycle[];
        setAcademicCycles(fetchedCycles);

        const qClassrooms = query(collection(db, 'classrooms'));
        const classroomsSnapshot = await getDocs(qClassrooms);
        const fetchedClassrooms = classroomsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Classroom[];
        setClassrooms(fetchedClassrooms);

        const qSubjects = query(collection(db, 'subjects'));
        const subjectsSnapshot = await getDocs(qSubjects);
        const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Subject[];
        setSubjects(fetchedSubjects);

      } catch (err: any) {
        console.error("Error al cargar datos iniciales:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchSubjectsByClassroom = async () => {
      if (!selectedClassroom) {
        setSubjects([]);
        return;
      }

      try {
        const q = query(collection(db, 'classroom_subjects'), where('classroomId', '==', selectedClassroom));
        const querySnapshot = await getDocs(q);
        const subjectIds = querySnapshot.docs.map(doc => doc.data().subjectId);

        if (subjectIds.length > 0) {
          const subjectsQuery = query(collection(db, 'subjects'), where('__name__', 'in', subjectIds));
          const subjectsSnapshot = await getDocs(subjectsQuery);
          const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          })) as Subject[];
          setSubjects(fetchedSubjects);
        } else {
          setSubjects([]);
        }
      } catch (error) {
        console.error("Error fetching subjects by classroom: ", error);
      }
    };

    fetchSubjectsByClassroom();
  }, [selectedClassroom]);

  useEffect(() => {
    const fetchStudentsAndGrades = async () => {
      if (!selectedCycle || !selectedClassroom) {
        setStudents([]);
        setGrades([]);
        return;
      }

      setLoading(true);
      try {
        const qEnrollments = query(
          collection(db, 'classroom_enrollments'),
          where('classroomId', '==', selectedClassroom),
          where('academicCycleId', '==', selectedCycle)
        );
        const enrollmentsSnapshot = await getDocs(qEnrollments);
        const enrolledStudentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);

        if (enrolledStudentIds.length === 0) {
          setStudents([]);
          setGrades([]);
          setLoading(false);
          return;
        }

        const qStudents = query(
          collection(db, 'users'),
          where('role', '==', 'ESTUDIANTE'),
          where('__name__', 'in', enrolledStudentIds)
        );
        const studentsSnapshot = await getDocs(qStudents);
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          dni: doc.data().dni || 'N/A',
        })) as Student[];
        setStudents(fetchedStudents);

        const qGrades = query(
          collection(db, 'grades'),
          where('academicCycleId', '==', selectedCycle),
          where('studentId', 'in', enrolledStudentIds)
        );
        const gradesSnapshot = await getDocs(qGrades);
        const fetchedGrades = gradesSnapshot.docs.map(doc => doc.data()) as Grade[];
        setGrades(fetchedGrades);

      } catch (err: any) {
        console.error("Error al cargar estudiantes y calificaciones:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndGrades();
  }, [selectedCycle, selectedClassroom]);

  const getStudentGrades = (studentId: string, subjectId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId && g.subjectId === subjectId);
    const trimester1 = studentGrades.find(g => g.trimester === 1)?.grade || 'N/A';
    const trimester2 = studentGrades.find(g => g.trimester === 2)?.grade || 'N/A';
    const trimester3 = studentGrades.find(g => g.trimester === 3)?.grade || 'N/A';
    const validGrades = [trimester1, trimester2, trimester3].filter(g => g !== 'N/A') as number[];
    const average = validGrades.length > 0 ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(2) : 'N/A';
    return { trimester1, trimester2, trimester3, average };
  };

  const handleDownloadPdf = (student: Student) => {
    const doc = new jsPDF();
    const tableColumn = ["Asignatura", "Trimestre 1", "Trimestre 2", "Trimestre 3", "Promedio"];
    const tableRows: any[] = [];

    subjects.forEach(subject => {
      const grades = getStudentGrades(student.id, subject.id);
      const row = [
        subject.name,
        grades.trimester1,
        grades.trimester2,
        grades.trimester3,
        grades.average,
      ];
      tableRows.push(row);
    });

    const cycleName = academicCycles.find(c => c.id === selectedCycle)?.name || '';
    const title = `Libreta de Calificación de ${student.name} - ${cycleName}`;
    doc.text(title, 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    const fileName = `Libreta-${student.name}-${cycleName}.pdf`;
    doc.save(fileName);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.dni && student.dni.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user || !['PRECEPTOR', 'DIRECTIVO', 'ADMIN'].includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center">Acceso denegado.</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800 mt-14">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center">Libretas de Calificaciones</h1>
          
          {/* <Link href="/dashboard" className="text-blue-500 hover:underline">Volver al Dashboard</Link> */}
        </div>

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="cycle" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Ciclo Lectivo:</label>
            <select
              id="cycle"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              required
            >
              <option value="">Seleccione un Ciclo</option>
              {academicCycles.map(cycle => (
                <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="classroom" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Aula:</label>
            <select
              id="classroom"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              required
            >
              <option value="">Seleccione un Aula</option>
              {classrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedClassroom && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {loading && <p>Cargando estudiantes y calificaciones...</p>}

        <div className="space-y-8">
          {filteredStudents.map(student => (
            <div key={student.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{student.name} (DNI: {student.dni})</h2>
                <button onClick={() => handleDownloadPdf(student)} className="cursor-pointer text-red-400">
                  <Icon path={mdiFilePdfBox} size={1} />
                </button>
              </div>
              <table className="w-full mt-4 text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">Asignatura</th>
                    <th scope="col" className="px-6 py-3">Trimestre 1</th>
                    <th scope="col" className="px-6 py-3">Trimestre 2</th>
                    <th scope="col" className="px-6 py-3">Trimestre 3</th>
                    <th scope="col" className="px-6 py-3">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => {
                    const grades = getStudentGrades(student.id, subject.id);
                    return (
                      <tr key={subject.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          {subject.name}
                        </th>
                        <td className="px-6 py-4">{grades.trimester1}</td>
                        <td className="px-6 py-4">{grades.trimester2}</td>
                        <td className="px-6 py-4">{grades.trimester3}</td>
                        <td className="px-6 py-4">{grades.average}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
