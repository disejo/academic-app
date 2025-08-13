'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface AcademicCycle {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface GradeInput {
  studentId: string;
  grade: number | '';
}

export default function DocenteGradesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicCycle, setActiveAcademicCycle] = useState<AcademicCycle | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTrimester, setSelectedTrimester] = useState<number | ''>('');
  const [gradesInput, setGradesInput] = useState<GradeInput[]>([]);

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

      // Fetch students (users with role ESTUDIANTE)
      const qStudents = query(collection(db, 'users'), where('role', '==', 'ESTUDIANTE'));
      const studentsSnapshot = await getDocs(qStudents);
      const fetchedStudents = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
      })) as Student[];
      setStudents(fetchedStudents);

      // Initialize grades input for all students
      setGradesInput(fetchedStudents.map(student => ({ studentId: student.id, grade: '' })));

    } catch (err: any) {
      console.error("Error fetching initial data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setGradesInput(prev =>
      prev.map(item =>
        item.studentId === studentId ? { ...item, grade: value === '' ? '' : parseFloat(value) } : item
      )
    );
  };

  const handleSubmitGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !activeAcademicCycle || !selectedSubject || !selectedTrimester) {
      setError("Please select an academic cycle, subject, and trimester.");
      return;
    }

    try {
      const gradesToSave = gradesInput.filter(g => g.grade !== '').map(g => ({
        studentId: g.studentId,
        subjectId: selectedSubject,
        academicCycleId: activeAcademicCycle.id,
        trimester: selectedTrimester,
        grade: g.grade,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      }));

      if (gradesToSave.length === 0) {
        setError("No grades to save.");
        return;
      }

      // Use a batch write for efficiency if many grades are being saved
      const batch = db.batch();
      gradesToSave.forEach(grade => {
        const newGradeRef = collection(db, 'grades').doc(); // Auto-generate ID
        batch.set(newGradeRef, grade);
      });
      await batch.commit();

      alert("Grades submitted successfully!");
      // Optionally, clear grades input or refetch to show saved grades
      setGradesInput(students.map(student => ({ studentId: student.id, grade: '' })));

    } catch (err: any) {
      console.error("Error submitting grades:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading data...</div>;
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
        <h1 className="text-2xl font-bold mb-6 text-center">Enter Grades</h1>

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
          <div>
            <label htmlFor="trimester" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Trimester:</label>
            <select
              id="trimester"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedTrimester}
              onChange={(e) => setSelectedTrimester(parseInt(e.target.value))}
              required
            >
              <option value="">Select a Trimester</option>
              <option value={1}>1st Trimester</option>
              <option value={2}>2nd Trimester</option>
              <option value={3}>3rd Trimester</option>
            </select>
          </div>
        </div>

        {activeAcademicCycle && (
          <p className="mb-4 text-center text-lg font-medium">Active Academic Cycle: {activeAcademicCycle.name}</p>
        )}

        <h2 className="text-xl font-semibold mb-4">Students and Grades</h2>
        <form onSubmit={handleSubmitGrades}>
          <div className="space-y-4 mb-6">
            {students.length === 0 ? (
              <p>No students found.</p>
            ) : (
              students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="font-medium">{student.name} ({student.email})</p>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    className="w-24 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                    value={gradesInput.find(g => g.studentId === student.id)?.grade || ''}
                    onChange={(e) => handleGradeChange(student.id, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
          >
            Submit Grades
          </button>
        </form>
      </div>
    </div>
  );
}
