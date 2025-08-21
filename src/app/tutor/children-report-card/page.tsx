/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AcademicCycle {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  trimester: number;
  grade: number;
}

interface SubjectGrades {
  subjectName: string;
  trimester1: number | '-';
  trimester2: number | '-';
  trimester3: number | '-';
  trimesterAverage: number | '-';
  finalAverage: number | '-';
}

interface Child {
  id: string;
  name: string;
}

export default function TutorChildrenReportCardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicCycle, setActiveAcademicCycle] = useState<AcademicCycle | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [childGrades, setChildGrades] = useState<SubjectGrades[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Redirect to login if not authenticated
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTutorChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChildId) {
      fetchReportCardData(selectedChildId);
    }
  }, [selectedChildId, activeAcademicCycle, subjects]); // Re-fetch when child, cycle, or subjects change

  const fetchTutorChildren = async () => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data().children) {
        const childrenUids = userDocSnap.data().children;
        const fetchedChildren: Child[] = [];
        for (const childUid of childrenUids) {
          const childDocRef = doc(db, 'users', childUid);
          const childDocSnap = await getDoc(childDocRef);
          if (childDocSnap.exists()) {
            fetchedChildren.push({ id: childDocSnap.id, name: childDocSnap.data().name });
          }
        }
        setChildren(fetchedChildren);
        if (fetchedChildren.length > 0) {
          setSelectedChildId(fetchedChildren[0].id); // Select first child by default
        }
      }

      // Fetch active academic cycle
      const qCycle = query(collection(db, 'academicCycles'), where('isActive', '==', true));
      const cycleSnapshot = await getDocs(qCycle);
      if (!cycleSnapshot.empty) {
        setActiveAcademicCycle({ id: cycleSnapshot.docs[0].id, name: cycleSnapshot.docs[0].data().name });
      } else {
        setError("No active academic cycle found. Please contact an administrator.");
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
      console.error("Error fetching tutor children or initial data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCardData = async (studentId: string) => {
    if (!activeAcademicCycle || subjects.length === 0) return; // Wait for these to be loaded

    try {
      // Fetch student's grades for the active academic cycle
      const qGrades = query(
        collection(db, 'grades'),
        where('studentId', '==', studentId),
        where('academicCycleId', '==', activeAcademicCycle.id)
      );
      const gradesSnapshot = await getDocs(qGrades);
      const fetchedGrades = gradesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Grade[];

      // Process grades to calculate averages
      const processedGrades: { [key: string]: SubjectGrades } = {};

      subjects.forEach(subject => {
        processedGrades[subject.id] = {
          subjectName: subject.name,
          trimester1: '-',
          trimester2: '-',
          trimester3: '-',
          trimesterAverage: '-',
          finalAverage: '-',
        };
      });

      fetchedGrades.forEach(grade => {
        if (processedGrades[grade.subjectId]) {
          if (grade.trimester === 1) processedGrades[grade.subjectId].trimester1 = grade.grade;
          if (grade.trimester === 2) processedGrades[grade.subjectId].trimester2 = grade.grade;
          if (grade.trimester === 3) processedGrades[grade.subjectId].trimester3 = grade.grade;
        }
      });

      Object.keys(processedGrades).forEach(subjectId => {
        const subjectData = processedGrades[subjectId];
        let sumTrimesterGrades = 0;
        let countTrimesterGrades = 0;

        if (typeof subjectData.trimester1 === 'number') { sumTrimesterGrades += subjectData.trimester1; countTrimesterGrades++; }
        if (typeof subjectData.trimester2 === 'number') { sumTrimesterGrades += subjectData.trimester2; countTrimesterGrades++; }
        if (typeof subjectData.trimester3 === 'number') { sumTrimesterGrades += subjectData.trimester3; countTrimesterGrades++; }

        if (countTrimesterGrades > 0) {
          subjectData.trimesterAverage = parseFloat((sumTrimesterGrades / countTrimesterGrades).toFixed(2));
        }

        if (typeof subjectData.trimester1 === 'number' && typeof subjectData.trimester2 === 'number' && typeof subjectData.trimester3 === 'number') {
          subjectData.finalAverage = parseFloat(((subjectData.trimester1 + subjectData.trimester2 + subjectData.trimester3) / 3).toFixed(2));
        }
      });

      setChildGrades(Object.values(processedGrades));

    } catch (err: any) {
      console.error("Error fetching report card data for child:", err);
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

  if (error && error.includes("No active academic cycle")) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">Reporte de mis hijos</h1>

        {children.length === 0 ? (
          <p className="text-center mb-4">Sin hijos asociados a Ud.</p>
        ) : (
          <div className="mb-6">
            <label htmlFor="childSelect" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Selecciona un hijo:</label>
            <select
              id="childSelect"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedChildId && activeAcademicCycle && (
          <p className="mb-4 text-center text-lg font-medium">Academic Cycle: {activeAcademicCycle.name}</p>
        )}

        {selectedChildId && childGrades.length === 0 && !loading ? (
          <p className="text-center">No hay notas para mostrar.</p>
        ) : selectedChildId && childGrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-left">Asignatura</th>
                  <th className="py-2 px-4 border-b dark:border-700 text-center">1 Trimestre</th>
                  <th className="py-2 px-4 border-b dark:border-700 text-center">2 Trimestre</th>
                  <th className="py-2 px-4 border-b dark:border-700 text-center">3 Trimestre</th>
                  <th className="py-2 px-4 border-b dark:border-700 text-center">Promedio.</th>
                  <th className="py-2 px-4 border-b dark:border-700 text-center">Promedio Final.</th>
                </tr>
              </thead>
              <tbody>
                {childGrades.map((data, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-4 border-b dark:border-gray-700">{data.subjectName}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700 text-center">{data.trimester1}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700 text-center">{data.trimester2}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700 text-center">{data.trimester3}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700 text-center font-semibold">{data.trimesterAverage}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700 text-center font-bold">{data.finalAverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
