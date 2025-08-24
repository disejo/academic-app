/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
}

interface Tutor extends User {
  children: User[];
}

const TutorPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [allTutors, setAllTutors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTutors, setExpandedTutors] = useState<string[]>([]);

  const allowedRoles = ['ADMIN', 'DIRECTIVO', 'PRECEPTOR'];

  const handleTutorChange = async (studentId: string, newTutorId: string) => {
    const studentRef = doc(db, 'users', studentId);
    try {
      await updateDoc(studentRef, { tutorId: newTutorId });
      const event = new Event('tutorChanged');
      document.dispatchEvent(event);
      alert("Tutor actualizado correctamente");
    } catch (error) {
      console.error("Error updating tutor: ", error);
      alert("Fallo al actualizar el tutor.");
    }
  };

  useEffect(() => {
    const fetchTutorsAndStudents = async () => {
      if (user && allowedRoles.includes(user.role || '')) {
        try {
          const tutorsQuery = query(collection(db, 'users'), where('role', '==', 'TUTOR'));
          const tutorsSnapshot = await getDocs(tutorsQuery);
          const tutorsData = tutorsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
          setAllTutors(tutorsData);

          const tutorsWithChildren: Tutor[] = [];

          for (const tutor of tutorsData) {
            const studentsQuery = query(collection(db, 'users'), where('tutorId', '==', tutor.uid));
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentsData = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            tutorsWithChildren.push({ ...tutor, children: studentsData });
          }

          setTutors(tutorsWithChildren);
        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
      setLoading(false);
    };

    if (!authLoading) {
      fetchTutorsAndStudents();
    }

    const handleTutorChanged = () => fetchTutorsAndStudents();
    document.addEventListener('tutorChanged', handleTutorChanged);

    return () => {
      document.removeEventListener('tutorChanged', handleTutorChanged);
    };
  }, [user, authLoading]);

  const toggleTutor = (tutorId: string) => {
    setExpandedTutors(prev => 
      prev.includes(tutorId) ? prev.filter(id => id !== tutorId) : [...prev, tutorId]
    );
  };

  const handleDelete = async (userId: string, isTutor: boolean) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar este ${isTutor ? 'tutor' : 'estudiante'}? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        // Refresh the list after deletion
        setTutors(prevTutors => {
          if (isTutor) {
            return prevTutors.filter(t => t.uid !== userId);
          } else {
            return prevTutors.map(t => ({
              ...t,
              children: t.children.filter(c => c.uid !== userId),
            }));
          }
        });
        alert(`${isTutor ? 'Tutor' : 'Estudiante'} eliminado correctamente.`);
      } catch (error) {
        console.error("Error deleting user: ", error);
        alert(`Fallo al eliminar ${isTutor ? 'tutor' : 'estudiante'}.`);
      }
    }
  };

  if (authLoading || loading) {
    return(
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
          <LoadingSpinner />
        </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role || '')) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-500">Acceso Denegado</h1>
          <p className="text-gray-600 dark:text-gray-400">No tienes permiso para ver esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen mx-auto p-4">
    <div className=''>
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Gestión de Tutores y Estudiantes</h1>
      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table className="min-w-full bg-gray-200 dark:bg-gray-600 border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Correo Electrónico</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 ">
            {tutors.map(tutor => (
              <>
                <tr key={tutor.uid} className="hover:bg-gray-400 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">
                    <button onClick={() => toggleTutor(tutor.uid)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600 cursor-pointer">
                      {expandedTutors.includes(tutor.uid) ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">{tutor.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">{tutor.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleDelete(tutor.uid, true)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600">X</button>
                  </td>
                </tr>
                {expandedTutors.includes(tutor.uid) && (
                  <tr>
                    <td colSpan={4} className="p-4 bg-gray-50 dark:bg-gray-900">
                      <h3 className="text-lg font-semibold mb-2 ml-4 text-gray-800 dark:text-white">Estudiantes</h3>
                      {tutor.children.length > 0 ? (
                        <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
                          <thead className="bg-gray-800 dark:bg-gray-600 ">
                            <tr>
                              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                              <th className="hidden md:block px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Correo Electrónico</th>
                              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tutor</th>
                              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {tutor.children.map(child => (
                              <tr key={child.uid} className="hover:bg-gray-400 dark:hover:bg-gray-600">
                                <td className="px-6 py-3 text-gray-800 dark:text-white">{child.name}</td>
                                <td className="hidden md:block px-6 py-3 text-gray-800 dark:text-white">{child.email}</td>
                                <td className="px-6 py-3 text-gray-800 dark:text-white">
                                  <select
                                    value={tutor.uid} // The current tutor of the expanded section
                                    onChange={(e) => handleTutorChange(child.uid, e.target.value)}
                                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                  >
                                    {allTutors.map(t => (
                                      <option key={t.uid} value={t.uid}>{t.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-3">
                                  <button onClick={() => handleDelete(child.uid, false)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600">X</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="ml-4 text-gray-500 dark:text-gray-400">No se encontraron estudiantes para este tutor.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};

export default TutorPage;