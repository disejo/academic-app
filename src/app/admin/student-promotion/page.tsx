'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface AcademicCycle {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  promotionStatus?: 'Promoted' | 'Repeating' | 'Pending';
}

export default function StudentPromotionPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicCycle, setActiveAcademicCycle] = useState<AcademicCycle | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [promotionStatusMap, setPromotionStatusMap] = useState<{ [key: string]: 'Promoted' | 'Repeating' | 'Pending' }>({});

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

      // Fetch students (users with role ESTUDIANTE)
      const qStudents = query(collection(db, 'users'), where('role', '==', 'ESTUDIANTE'));
      const studentsSnapshot = await getDocs(qStudents);
      const fetchedStudents = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        promotionStatus: doc.data().promotionStatus || 'Pending',
      })) as Student[];
      setStudents(fetchedStudents);

      const initialStatusMap: { [key: string]: 'Promoted' | 'Repeating' | 'Pending' } = {};
      fetchedStudents.forEach(student => {
        initialStatusMap[student.id] = student.promotionStatus || 'Pending';
      });
      setPromotionStatusMap(initialStatusMap);

    } catch (err: any) {
      console.error("Error fetching initial data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'Promoted' | 'Repeating' | 'Pending') => {
    setPromotionStatusMap(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSavePromotion = async () => {
    setError(null);
    if (!user || !activeAcademicCycle) {
      setError("Authentication or active academic cycle missing.");
      return;
    }

    try {
      const batch = writeBatch(db);
      students.forEach(student => {
        const studentRef = doc(db, 'users', student.id);
        batch.update(studentRef, { promotionStatus: promotionStatusMap[student.id] });
      });
      await batch.commit();
      alert("Student promotion statuses saved successfully!");
    } catch (err: any) {
      console.error("Error saving promotion statuses:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Student Promotion...</div>;
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
        <h1 className="text-2xl font-bold mb-6 text-center">Student Promotion Management</h1>

        {activeAcademicCycle && (
          <p className="mb-4 text-center text-lg font-medium">Active Academic Cycle: {activeAcademicCycle.name}</p>
        )}

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        {students.length === 0 ? (
          <p className="text-center">No students found.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-left">Student Name</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-left">Email</th>
                  <th className="py-2 px-4 border-b dark:border-gray-700 text-center">Promotion Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-4 border-b dark:border-gray-700">{student.name}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700">{student.email}</td>
                    <td className="py-2 px-4 border-b dark:border-gray-700 text-center">
                      <select
                        value={promotionStatusMap[student.id] || 'Pending'}
                        onChange={(e) => handleStatusChange(student.id, e.target.value as 'Promoted' | 'Repeating' | 'Pending')}
                        className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Repeating">Repeating</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={handleSavePromotion}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
        >
          Save Promotion Statuses
        </button>
      </div>
    </div>
  );
}
