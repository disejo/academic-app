'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

// Interfaces
interface Classroom { id: string; name: string; }
interface AcademicCycle { id: string; name: string; }
interface Student { id: string; name: string; email: string; }
interface Enrollment { id: string; studentId: string; studentName: string; }

const ClassroomDetailPage = () => {
  const params = useParams();
  const classroomId = params.id as string;
  const { user } = useAuth();
  console.log("Current user:", user);

  // State
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrolledInThisClass, setEnrolledInThisClass] = useState<Enrollment[]>([]);
  const [allEnrolledStudentIds, setAllEnrolledStudentIds] = useState<Set<string>>(new Set());
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string>('');

  const canManage = user && ['ADMIN', 'DIRECTIVO', 'PRECEPTOR'].includes(user.role);

  // Effect to fetch basic data (classroom, all cycles, all students)
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!classroomId) return;
      const docRef = doc(db, 'classrooms', classroomId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClassroom({ id: docSnap.id, ...docSnap.data() } as Classroom);
      } else {
        setLoadingError('Aula no encontrada.');
      }
      setLoading(false);
    };

    const fetchCycles = async () => {
        const q = query(collection(db, 'academicCycles'), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        const cycles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicCycle));
        setAcademicCycles(cycles);
        if (cycles.length > 0) {
            setSelectedCycleId(cycles[0].id);
        }
        console.log("Fetched academic cycles:", cycles);
        console.log("Selected cycle ID:", cycles.length > 0 ? cycles[0].id : "No cycles available");
    };

    const fetchStudents = async () => {
        const q = query(collection(db, 'users'), where('role', '==', 'ESTUDIANTE'));
        const querySnapshot = await getDocs(q);
        setAllStudents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    };
    
    Promise.all([fetchClassroom(), fetchCycles(), fetchStudents()]).catch(err => {
        console.error("Error fetching initial data:", err);
        setLoadingError("Failed to load page data.");
    });
  }, [classroomId]);

  // Effect to get students enrolled in THIS specific class for the selected cycle
  useEffect(() => {
    if (!classroomId || !selectedCycleId) return;
    const enrollmentsQuery = query(
      collection(db, 'classroom_enrollments'),
      where('classroomId', '==', classroomId),
      where('academicCycleId', '==', selectedCycleId)
    );
    const unsubscribe = onSnapshot(enrollmentsQuery, (querySnapshot) => {
      const enrollments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
      setEnrolledInThisClass(enrollments);
    });
    return () => unsubscribe();
  }, [classroomId, selectedCycleId]);

  // Effect to get ALL students enrolled in ANY class for the selected cycle
  useEffect(() => {
    if (!selectedCycleId) return;
    const allEnrollmentsQuery = query(
        collection(db, 'classroom_enrollments'),
        where('academicCycleId', '==', selectedCycleId)
    );
    const unsubscribe = onSnapshot(allEnrollmentsQuery, (querySnapshot) => {
        const studentIds = new Set<string>();
        querySnapshot.forEach(doc => {
            studentIds.add(doc.data().studentId);
        });
        setAllEnrolledStudentIds(studentIds);
    });
    return () => unsubscribe();
  }, [selectedCycleId]);

  // Memoized list of available students
  const availableStudents = useMemo(() => {
    return allStudents.filter(s => !allEnrolledStudentIds.has(s.id));
  }, [allStudents, allEnrolledStudentIds]);

  // Handlers
  const handleEnrollStudent = async (student: Student) => {
    if (!canManage) return alert('No tienes permiso para realizar esta acción.');
    if (!selectedCycleId) return alert('Por favor, selecciona un ciclo lectivo.');
    
    // Double-check to prevent race conditions
    if (allEnrolledStudentIds.has(student.id)) {
        return alert("This student is already enrolled in a classroom for this cycle.");
    }

    try {
        await addDoc(collection(db, 'classroom_enrollments'), {
            classroomId: classroomId,
            academicCycleId: selectedCycleId,
            studentId: student.id,
            studentName: student.name,
            enrolledAt: new Date(),
        });
    } catch (error) {
        console.error("Error enrolling student:", error);
        alert('Error al inscribir al estudiante.');
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!canManage) return alert('No tienes permiso para realizar esta acción.');
    try {
        await deleteDoc(doc(db, 'classroom_enrollments', enrollmentId));
    } catch (error) {
        console.error("Error removing enrollment:", error);
        alert('Error al quitar la inscripción.');
    }
  };

  console.log("canManage:", canManage);
  console.log("selectedCycleId:", selectedCycleId);

  if (loading) return <div className="text-center p-10 dark:text-gray-200 mt-14">Cargando datos del aula...</div>;
  if (loadingError) return <div className="text-center p-10 text-red-500 mt-14">{loadingError}</div>;
  if (!classroom) return <div className="text-center p-10 dark:text-gray-200 mt-14">Aula no encontrada.</div>;

  return (
    <div className="container mx-auto p-4 text-gray-900 dark:text-gray-100 mt-14">
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className='flex justify-between items-center mb-4'>
            <h1 className="text-3xl font-bold mt-2">Aula: {classroom.name}</h1>
            <Link href="/preceptor/classrooms" className="text-blue-600 dark:text-blue-400 hover:underline">&larr; Volver a todas las aulas</Link>
        </div>
        <h2 className="text-2xl font-semibold mb-4">Asignar Estudiantes</h2>
        
        <div className="mb-4">
            <label htmlFor="academic-cycle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciclo Lectivo</label>
            <select
                id="academic-cycle"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
                {academicCycles.length > 0 ? (
                    academicCycles.map(cycle => (
                        <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                    ))
                ) : (
                    <option value="" disabled>No hay ciclos lectivos activos</option>
                )}
            </select>
        </div>

        {canManage && selectedCycleId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                    <h3 className="text-xl font-semibold mb-3">Estudiantes Disponibles</h3>
                    <div className="h-96 overflow-y-auto border rounded-md p-2 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                        {availableStudents.length > 0 ? (
                            <ul>
                                {availableStudents.map(student => (
                                    <li key={student.id} className="flex justify-between items-center p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                                        <span>{student.name} <span className="text-sm text-gray-500 dark:text-gray-400">({student.email})</span></span>
                                        <button onClick={() => handleEnrollStudent(student)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md hover:bg-green-600">+</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 p-4">No hay estudiantes disponibles para inscribir.</p>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-3">Estudiantes Inscritos (en esta aula)</h3>
                    <div className="h-96 overflow-y-auto border rounded-md p-2 bg-white dark:bg-gray-900 dark:border-gray-700">
                        {enrolledInThisClass.length > 0 ? (
                            <ul>
                                {enrolledInThisClass.map(enrollment => (
                                    <li key={enrollment.id} className="flex justify-between items-center p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
                                        <span>{enrollment.studentName}</span>
                                        <button onClick={() => handleRemoveEnrollment(enrollment.id)} className="bg-red-500 text-white px-3 py-1 text-sm rounded-md hover:bg-red-600">-</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 p-4">No hay estudiantes inscritos en esta aula para el ciclo seleccionado.</p>
                        )}
                    </div>
                </div>
            </div>
        )}

        </div>
    </div>
  );
};

export default ClassroomDetailPage;