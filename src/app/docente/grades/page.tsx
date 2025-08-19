/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Icon from '@mdi/react';
import { mdiFileExcel } from '@mdi/js';
import { mdiFilePdfBox } from '@mdi/js';


interface AcademicCycle {
  id: string;
  name: string;
}

interface Subject {
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

interface GradeInput {
  studentId: string;
  trimester1: number | '';
  trimester2: number | '';
  trimester3: number | '';
}

interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  trimester: number;
  grade: number;
}

export default function DocenteGradesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicCycle, setActiveAcademicCycle] = useState<AcademicCycle | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [gradesInput, setGradesInput] = useState<GradeInput[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchInitialData();
      } else {
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const qCycle = query(collection(db, 'academicCycles'), where('isActive', '==', true));
      const cycleSnapshot = await getDocs(qCycle);
      if (!cycleSnapshot.empty) {
        setActiveAcademicCycle({ id: cycleSnapshot.docs[0].id, name: cycleSnapshot.docs[0].data().name });
      } else {
        setError("No se encontró un ciclo académico activo. Por favor, contacte a un administrador.");
        setLoading(false);
        return;
      }

      const qClassrooms = query(collection(db, 'classrooms'));
      const classroomsSnapshot = await getDocs(qClassrooms);
      const fetchedClassrooms = classroomsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Classroom[];
      setClassrooms(fetchedClassrooms);

      setGradesInput([]);

    } catch (err: any) {
      console.error("Error al cargar los datos iniciales:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubjectsByClassroom = async () => {
      if (!selectedClassroom || !user) {
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
          // Filtrar solo las asignaturas donde el docente es titular, suplente o auxiliar
          const fetchedSubjects = subjectsSnapshot.docs
            .map(doc => ({
              id: doc.id,
              name: doc.data().name,
              titularId: doc.data().titularId,
              suplenteId: doc.data().suplenteId,
              auxiliarId: doc.data().auxiliarId,
            }))
            .filter(subject =>
              subject.titularId === user.uid ||
              subject.suplenteId === user.uid ||
              subject.auxiliarId === user.uid
            ) as Subject[];
          setSubjects(fetchedSubjects);
        } else {
          setSubjects([]);
        }
      } catch (error) {
        console.error("Error al obtener asignaturas del aula: ", error);
      }
    };

    fetchSubjectsByClassroom();
  }, [selectedClassroom, user]);

  useEffect(() => {
    const fetchStudentsByClassroom = async () => {
      if (!activeAcademicCycle || !selectedClassroom) {
        setStudents([]);
        setGradesInput([]);
        return;
      }

      try {
        const qEnrollments = query(
          collection(db, 'classroom_enrollments'),
          where('classroomId', '==', selectedClassroom),
          where('academicCycleId', '==', activeAcademicCycle.id)
        );
        const enrollmentsSnapshot = await getDocs(qEnrollments);
        const enrolledStudentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);

        if (enrolledStudentIds.length === 0) {
          setStudents([]);
          setGradesInput([]);
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

        // Sort students by name A-Z
        fetchedStudents.sort((a, b) => a.name.localeCompare(b.name));

        setStudents(fetchedStudents);

        setGradesInput(fetchedStudents.map(student => ({ studentId: student.id, trimester1: '', trimester2: '', trimester3: '' })));

      } catch (err: any) {
        console.error("Error al cargar estudiantes por clase:", err);
        setError(err.message);
      }
    };

    fetchStudentsByClassroom();
  }, [activeAcademicCycle, selectedClassroom]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!activeAcademicCycle || !selectedSubject || students.length === 0) {
        setGradesInput(students.map(student => ({ studentId: student.id, trimester1: '', trimester2: '', trimester3: '' })));
        return;
      }

      try {
        const qGrades = query(
          collection(db, 'grades'),
          where('academicCycleId', '==', activeAcademicCycle.id),
          where('subjectId', '==', selectedSubject)
        );
        const gradesSnapshot = await getDocs(qGrades);
        const fetchedGrades = gradesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Grade[];

        const newGradesInput = students.map(student => {
          const studentGrades = fetchedGrades.filter(g => g.studentId === student.id);
          const getGrade = (trimester: number): number | "" => {
            const grade = studentGrades.find(g => g.trimester === trimester)?.grade;
            return typeof grade === "number" ? grade : "";
          };
          return {
            studentId: student.id,
            trimester1: getGrade(1),
            trimester2: getGrade(2),
            trimester3: getGrade(3),
          };
        });
        setGradesInput(newGradesInput);

      } catch (err: any) {
        console.error("Error al cargar las calificaciones:", err);
        setError(err.message);
      }
    };

    fetchGrades();
  }, [activeAcademicCycle, selectedSubject, students]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleGradeChange = useCallback(async (studentId: string, trimester: number, value: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(async () => {
      const grade = value === '' ? '' : parseFloat(value);
      setGradesInput(prev =>
        prev.map(item =>
          item.studentId === studentId ? { ...item, [`trimester${trimester}`]: grade } : item
        )
      );

      if (!user || !activeAcademicCycle || !selectedSubject) {
        return;
      }

      try {
        const gradeData = {
          studentId,
          subjectId: selectedSubject,
          academicCycleId: activeAcademicCycle.id,
          trimester,
          grade,
          teacherId: user.uid,
          updatedAt: serverTimestamp(),
        };

        const q = query(
          collection(db, 'grades'),
          where('studentId', '==', studentId),
          where('subjectId', '==', selectedSubject),
          where('academicCycleId', '==', activeAcademicCycle.id),
          where('trimester', '==', trimester)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await setDoc(doc(db, 'grades', docId), gradeData, { merge: true });
        } else {
          await addDoc(collection(db, 'grades'), { ...gradeData, createdAt: serverTimestamp() });
        }
      } catch (err: any) {
        console.error("Error al guardar la calificación:", err);
        setError(err.message);
      }
    }, 500); // Debounce for 500ms
  }, [user, activeAcademicCycle, selectedSubject, setGradesInput]); // Dependencies for useCallback

  // Clean up the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculateAverage = (grades: GradeInput) => {
    const validGrades = [grades.trimester1, grades.trimester2, grades.trimester3].filter(g => g !== '') as number[];
    if (validGrades.length === 0) return 'N/A';
    const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
    return (sum / validGrades.length).toFixed(2);
  };

  const getSelectedClassName = () => classrooms.find(c => c.id === selectedClassroom)?.name || 'clase';
  const getSelectedSubjectName = () => subjects.find(s => s.id === selectedSubject)?.name || 'asignatura';

  const handleDownloadExcel = () => {
    const data = students.map(student => {
      const studentGrades = gradesInput.find(g => g.studentId === student.id);
      return {
        DNI: student.dni,
        Estudiante: student.name,
        Trimestre1: studentGrades?.trimester1 || '',
        Trimestre2: studentGrades?.trimester2 || '',
        Trimestre3: studentGrades?.trimester3 || '',
        Promedio: studentGrades ? calculateAverage(studentGrades) : 'N/A',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
    const fileName = `${getSelectedClassName()}-${getSelectedSubjectName()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const tableColumn = ["DNI", "Estudiante", "T1", "T2", "T3", "Promedio"];
    const tableRows: any[] = [];

    students.forEach(student => {
      const studentGrades = gradesInput.find(g => g.studentId === student.id);
      const row = [
        student.dni,
        student.name,
        studentGrades?.trimester1 || '',
        studentGrades?.trimester2 || '',
        studentGrades?.trimester3 || '',
        studentGrades ? calculateAverage(studentGrades) : 'N/A',
      ];
      tableRows.push(row);
    });

    const title = `Calificaciones - ${getSelectedClassName()} - ${getSelectedSubjectName()}`;
    doc.text(title, 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    const fileName = `${getSelectedClassName()}-${getSelectedSubjectName()}.pdf`;
    doc.save(fileName);
  };


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando datos...</div>;
  }

  if (error && error.includes("No se encontró un ciclo académico activo")) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className='mt-14'>
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">Ingresar Calificaciones</h1>

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="classroom" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Clase:</label>
            <select
              id="classroom"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              required
            >
              <option value="">Seleccione una Clase</option>
              {classrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Asignatura:</label>
            <select
              id="subject"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              required
            >
              <option value="">Seleccione una Asignatura</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
        </div>

        {activeAcademicCycle && (
          <p className="mb-4 text-center text-lg font-medium">Ciclo Académico Activo: {activeAcademicCycle.name}</p>
        )}

        {selectedSubject && (
          <div>
            <div className="flex justify-end space-x-4 mb-4">
              <button onClick={handleDownloadExcel} className="cursor-pointer hover:text-green-600"><Icon path={mdiFileExcel} size={1.5} /></button>
              <button onClick={handleDownloadPdf} className="cursor-pointer hover:text-red-600"><Icon path={mdiFilePdfBox} size={1.5} /></button>
            </div>
            <h2 className="text-xl font-semibold mb-4">Estudiantes y Calificaciones</h2>
            <div className="space-y-4 mb-6">
              {students.length === 0 ? (
                <p>No se encontraron estudiantes.</p>
              ) : (
                students.map((student) => {
                  const studentGrades = gradesInput.find(g => g.studentId === student.id);
                  return (
                    <div key={student.id} className="grid grid-cols-6 gap-4 items-center p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="font-medium col-span-2">{student.name} ({student.dni??'N/A'})</p>
                      <div className="flex items-center space-x-2">
                        <input
                        placeholder='T1'
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          className="w-24 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                          value={studentGrades?.trimester1 || ''}
                          onChange={(e) => handleGradeChange(student.id, 1, e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                        placeholder='T2'
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          className="w-24 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                          value={studentGrades?.trimester2 || ''}
                          onChange={(e) => handleGradeChange(student.id, 2, e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                        placeholder='T3'
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          className="w-24 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                          value={studentGrades?.trimester3 || ''}
                          onChange={(e) => handleGradeChange(student.id, 3, e.target.value)}
                        />
                      </div>
                      <div className="text-center font-bold">
                        Prom: {studentGrades ? calculateAverage(studentGrades) : 'N/A'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
