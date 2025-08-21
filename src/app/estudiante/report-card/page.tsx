'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

export default function StudentReportCardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicCycle, setActiveAcademicCycle] = useState<AcademicCycle | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentGrades, setStudentGrades] = useState<SubjectGrades[]>([]);

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
      fetchReportCardData();
    }
  }, [user]);

  const fetchReportCardData = async () => {
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

      // Fetch student's grades for the active academic cycle
      const qGrades = query(
        collection(db, 'grades'),
        where('studentId', '==', user.uid),
        where('academicCycleId', '==', cycleSnapshot.docs[0].id)
      );
      const gradesSnapshot = await getDocs(qGrades);
      const fetchedGrades = gradesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Grade[];

      // Process grades to calculate averages
      const processedGrades: { [key: string]: SubjectGrades } = {};

      fetchedSubjects.forEach(subject => {
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

        // Final average (assuming it's the average of all three trimesters if available)
        if (typeof subjectData.trimester1 === 'number' && typeof subjectData.trimester2 === 'number' && typeof subjectData.trimester3 === 'number') {
          subjectData.finalAverage = parseFloat(((subjectData.trimester1 + subjectData.trimester2 + subjectData.trimester3) / 3).toFixed(2));
        }
      });

      setStudentGrades(Object.values(processedGrades));

    } catch (err: any) {
      console.error("Error fetching report card data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">My Report Card</h1>

        {activeAcademicCycle && (
          <p className="mb-4 text-center text-lg font-medium">Academic Cycle: {activeAcademicCycle.name}</p>
        )}

        {studentGrades.length === 0 ? (
          <p className="text-center">No grades found for this academic cycle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-left">Subject</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-center">1st Trimester</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-center">2nd Trimester</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-center">3rd Trimester</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-center">Trimester Avg.</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-center">Final Avg.</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((data, index) => (
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
        )}
      </div>
    </div>
  );
}
