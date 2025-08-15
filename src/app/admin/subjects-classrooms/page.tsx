'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface Classroom {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function AssignSubjectsToClassroomPage() {
  const { user, loading: authLoading } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClassroomsAndSubjects = async () => {
      setLoading(true);
      try {
        const classroomsSnapshot = await getDocs(collection(db, 'classrooms'));
        const fetchedClassrooms = classroomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Classroom[];
        setClassrooms(fetchedClassrooms);

        const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
        const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subject[];
        setSubjects(fetchedSubjects);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassroomsAndSubjects();
  }, []);

  useEffect(() => {
    if (!selectedClassroom) return;

    const fetchAssignedSubjects = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'classroom_subjects'), where('classroomId', '==', selectedClassroom));
        const querySnapshot = await getDocs(q);
        const fetchedAssignedSubjects = querySnapshot.docs.map(doc => doc.data().subjectId);
        setAssignedSubjects(fetchedAssignedSubjects);
      } catch (error) {
        console.error("Error fetching assigned subjects: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSubjects();
  }, [selectedClassroom]);

  const handleSubjectAssignmentChange = async (subjectId: string, isChecked: boolean) => {
    if (!selectedClassroom) return;

    if (isChecked) {
      await addDoc(collection(db, 'classroom_subjects'), {
        classroomId: selectedClassroom,
        subjectId: subjectId,
      });
      setAssignedSubjects([...assignedSubjects, subjectId]);
    } else {
      const q = query(
        collection(db, 'classroom_subjects'),
        where('classroomId', '==', selectedClassroom),
        where('subjectId', '==', subjectId)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'classroom_subjects', document.id));
      });
      setAssignedSubjects(assignedSubjects.filter(id => id !== subjectId));
    }
  };
  
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user || !['ADMIN', 'DIRECTIVO', 'PRECEPTOR'].includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center">Acceso denegado.</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">Asignar Asignaturas a Aulas</h1>

        <div className="mb-4">
          <label htmlFor="classroom" className="block text-sm font-bold mb-2 dark:text-gray-300">Seleccione un Aula:</label>
          <select
            id="classroom"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
          >
            <option value="">-- Seleccione un Aula --</option>
            {classrooms.map(classroom => (
              <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
            ))}
          </select>
        </div>

        {loading && <p>Cargando asignaturas...</p>}

        {selectedClassroom && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(subject => (
              <div key={subject.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`subject-${subject.id}`}
                  checked={assignedSubjects.includes(subject.id)}
                  onChange={(e) => handleSubjectAssignmentChange(subject.id, e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor={`subject-${subject.id}`}>{subject.name}</label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
