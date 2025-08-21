/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AcademicCycle {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Program {
  id?: string;
  teacherId: string;
  subjectId: string;
  academicCycleId: string;
  title: string;
  content: string;
  createdAt: any;
  updatedAt: any;
}

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
});

export default function DocenteProgramsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicCycle, setActiveAcademicCycle] = useState<AcademicCycle | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [programTitle, setProgramTitle] = useState('');
  const [programContent, setProgramContent] = useState('');
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchInitialData();
      } else {
        // Redirect to login if not authenticated
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && activeAcademicCycle && selectedSubject) {
      fetchProgram();
    }
  }, [user, activeAcademicCycle, selectedSubject]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch active academic cycle
      const qCycle = query(collection(db, 'academicCycles'), where('isActive', '==', true));
      const cycleSnapshot = await getDocs(qCycle);
      if (!cycleSnapshot.empty) {
        setActiveAcademicCycle({ id: cycleSnapshot.docs[0].id, name: cycleSnapshot.docs[0].data().name });
      } else {
  setError("No se encontró un ciclo académico activo. Por favor, contacte a un administrador.");
        setLoading(false);
        return;
      }

      // Fetch subjects asignadas al docente
      const qSubjects = query(collection(db, 'subjects'));
      const subjectsSnapshot = await getDocs(qSubjects);
      let fetchedSubjects: Subject[] = [];
      if (user) {
        fetchedSubjects = subjectsSnapshot.docs
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
      }
      setSubjects(fetchedSubjects);

    } catch (err: any) {
  console.error("Error al obtener los datos iniciales:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgram = async () => {
    if (!user || !activeAcademicCycle || !selectedSubject) return;

    try {
      const qProgram = query(
        collection(db, 'programs'),
        where('teacherId', '==', user.uid),
        where('subjectId', '==', selectedSubject),
        where('academicCycleId', '==', activeAcademicCycle.id)
      );
      const programSnapshot = await getDocs(qProgram);

      if (!programSnapshot.empty) {
        const programData = programSnapshot.docs[0].data() as Program;
        setCurrentProgram({ ...programData, id: programSnapshot.docs[0].id });
        setProgramTitle(programData.title);
        setProgramContent(programData.content);
      } else {
        setCurrentProgram(null);
        setProgramTitle('');
        setProgramContent('');
      }
    } catch (err: any) {
  console.error("Error al obtener el programa:", err);
      setError(err.message);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !activeAcademicCycle || !selectedSubject || !programTitle || !programContent) {
  setError("Por favor, complete todos los campos requeridos.");
      return;
    }

    try {
      const programData: Program = {
        teacherId: user.uid,
        subjectId: selectedSubject,
        academicCycleId: activeAcademicCycle.id,
        title: programTitle,
        content: programContent,
        createdAt: currentProgram?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (currentProgram?.id) {
        // Update existing program
        await updateDoc(doc(db, 'programs', currentProgram.id), { ...programData });
  alert("¡Programa actualizado exitosamente!");
      } else {
        // Create new program
        await addDoc(collection(db, 'programs'), { ...programData });
  alert("¡Programa creado exitosamente!");
      }
      fetchProgram(); // Refresh current program state
    } catch (err: any) {
  console.error("Error al guardar el programa:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && error.includes("No se encontró un ciclo académico activo")) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-0 dark:bg-gray-800 mt-14 bg-white text-gray-700 dark:text-white">
      <div className="w-full bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
  <h1 className="text-2xl font-bold mb-6 text-center">Gestionar mis programas</h1>

  {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Asignatura:</label>
            <select
              id="subject"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              required
            >
              <option value="">Seleccione una asignatura</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          {activeAcademicCycle && (
            <div className="flex items-center justify-center">
              <p className="text-lg font-medium">Ciclo académico activo: {activeAcademicCycle.name}</p>
            </div>
          )}
        </div>

        {selectedSubject && activeAcademicCycle && (
          <form onSubmit={handleSaveProgram} className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">{currentProgram ? 'Editar programa' : 'Crear nuevo programa'}</h2>
            <div className="mb-4">
              <label htmlFor="programTitle" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Título del programa:</label>
              <input
                type="text"
                id="programTitle"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                value={programTitle}
                onChange={(e) => setProgramTitle(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programContent" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Contenido del programa:</label>
              <RichTextEditor value={programContent} onChange={setProgramContent} />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
            >
              {currentProgram ? 'Actualizar programa' : 'Crear programa'}
            </button>
          </form>
  )} {!selectedSubject && <p className="text-center">Por favor, seleccione una asignatura para gestionar programas.</p>}
      </div>
    </div>
  );
}