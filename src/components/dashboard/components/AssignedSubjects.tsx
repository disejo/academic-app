'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface Classroom {
  id: string;
  name: string;
}

interface Subject extends DocumentData {
  id: string;
  name: string;
  classrooms: Classroom[];
}

interface AssignedSubjectsProps {
  user: User | null;
  role: string | null;
}

export default function AssignedSubjects({ user, role }: AssignedSubjectsProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isFetchingSubjects, setIsFetchingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjectsAndClassrooms = async () => {
      if (user && role === 'DOCENTE') {
        setIsFetchingSubjects(true);
        try {
          // Step 1: Fetch subjects assigned to the teacher
          const subjectsRef = collection(db, 'subjects');
          const subjectQueries = [
            query(subjectsRef, where('titularId', '==', user.uid)),
            query(subjectsRef, where('auxiliarId', '==', user.uid)),
            query(subjectsRef, where('suplenteId', '==', user.uid))
          ];
          const querySnapshots = await Promise.all(subjectQueries.map(q => getDocs(q)));
          
          const uniqueSubjects = new Map<string, DocumentData>();
          querySnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
              if (!uniqueSubjects.has(doc.id)) {
                uniqueSubjects.set(doc.id, { id: doc.id, ...doc.data() });
              }
            });
          });
          const initialSubjects = Array.from(uniqueSubjects.values());

          if (initialSubjects.length === 0) {
            setSubjects([]);
            setIsFetchingSubjects(false);
            return;
          }

          // Step 2: Fetch all classroom-subject relations for these subjects
          const subjectIds = initialSubjects.map(s => s.id);
          const classroomSubjectsRef = collection(db, 'classroom_subjects');
          const relationsQuery = query(classroomSubjectsRef, where('subjectId', 'in', subjectIds));
          const relationsSnapshot = await getDocs(relationsQuery);

          const subjectToClassroomIds = new Map<string, string[]>();
          relationsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const subjectId = data.subjectId;
            const classroomId = data.classroomId;
            if (!subjectToClassroomIds.has(subjectId)) {
              subjectToClassroomIds.set(subjectId, []);
            }
            subjectToClassroomIds.get(subjectId)?.push(classroomId);
          });

          // Step 3: Fetch details for all unique classrooms
          const allClassroomIds = [...new Set(Array.from(subjectToClassroomIds.values()).flat())];
          const classroomsMap = new Map<string, string>();

          if (allClassroomIds.length > 0) {
            const classroomChunks = [];
            for (let i = 0; i < allClassroomIds.length; i += 30) {
                classroomChunks.push(allClassroomIds.slice(i, i + 30));
            }

            const classroomPromises = classroomChunks.map(chunk => 
                getDocs(query(collection(db, 'classrooms'), where('__name__', 'in', chunk)))
            );
            
            const classroomSnapshots = await Promise.all(classroomPromises);

            classroomSnapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    classroomsMap.set(doc.id, doc.data().name || 'Nombre no encontrado');
                });
            });
          }

          // Step 4: Combine data
          const finalSubjects = initialSubjects.map(subject => {
            const classroomIds = subjectToClassroomIds.get(subject.id) || [];
            const classrooms = classroomIds.map(id => ({
              id,
              name: classroomsMap.get(id) || 'Nombre no encontrado'
            })).filter(c => c.name !== 'Nombre no encontrado');
            
            return { ...subject, classrooms };
          });

          setSubjects(finalSubjects as Subject[]);

        } catch (err) {
          console.error("Error fetching subjects and classrooms: ", err);
          setError("No se pudieron cargar las materias asignadas.");
        } finally {
          setIsFetchingSubjects(false);
        }
      }
    };

    fetchSubjectsAndClassrooms();
  }, [user, role]);

  if (role !== 'DOCENTE') {
    return null; // Do not render anything if the user is not a teacher
  }

  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md p-5 w-full mt-8">
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Materias y Aulas Asignadas</h2>
      {isFetchingSubjects ? (
        <p className="text-gray-500 dark:text-gray-400">Cargando materias...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : subjects.length > 0 ? (
        <ul className="space-y-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {subjects.map(subject => (
            <li key={subject.id} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{subject.name || 'Nombre no disponible'}</p>
              {subject.classrooms && subject.classrooms.length > 0 ? (
                  <ul className="mt-2 space-y-1 pl-5 list-disc">
                      {subject.classrooms.map(classroom => (
                          <li key={classroom.id} className="text-sm text-gray-600 dark:text-gray-300">{classroom.name}</li>
                      ))}
                  </ul>
              ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 pl-5">- No hay aulas asignadas a esta materia.</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No tienes materias asignadas.</p>
      )}
    </div>
    </div>
  );
}
