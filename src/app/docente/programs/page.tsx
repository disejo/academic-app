'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
        setError("No active academic cycle found. Please contact an administrator.");
        setLoading(false);
        return;
      }

      // Fetch subjects
      const qSubjects = query(collection(db, 'subjects'));
      const subjectsSnapshot = await getDocs(qSubjects);
      const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Subject[];
      setSubjects(fetchedSubjects);

    } catch (err: any) {
      console.error("Error fetching initial data:", err);
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
      console.error("Error fetching program:", err);
      setError(err.message);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !activeAcademicCycle || !selectedSubject || !programTitle || !programContent) {
      setError("Please fill all required fields.");
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
        await updateDoc(doc(db, 'programs', currentProgram.id), programData);
        alert("Program updated successfully!");
      } else {
        // Create new program
        await addDoc(collection(db, 'programs'), programData);
        alert("Program created successfully!");
      }
      fetchProgram(); // Refresh current program state
    } catch (err: any) {
      console.error("Error saving program:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Programs...</div>;
  }

  if (error && error.includes("No active academic cycle")) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">Manage My Programs</h1>

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Subject:</label>
            <select
              id="subject"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              required
            >
              <option value="">Select a Subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          {activeAcademicCycle && (
            <div className="flex items-center justify-center">
              <p className="text-lg font-medium">Active Academic Cycle: {activeAcademicCycle.name}</p>
            </div>
          )}
        </div>

        {selectedSubject && activeAcademicCycle && (
          <form onSubmit={handleSaveProgram} className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">{currentProgram ? 'Edit Program' : 'Create New Program'}</h2>
            <div className="mb-4">
              <label htmlFor="programTitle" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Program Title:</label>
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
              <label htmlFor="programContent" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Program Content:</label>
              <textarea
                id="programContent"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                value={programContent}
                onChange={(e) => setProgramContent(e.target.value)}
                rows={10}
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
            >
              {currentProgram ? 'Update Program' : 'Create Program'}
            </button>
          </form>
        )} {!selectedSubject && <p className="text-center">Please select a subject to manage programs.</p>}
      </div>
    </div>
  );
}
