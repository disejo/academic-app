/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AcademicCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: any;
  createdBy: string;
}

export default function AcademicCyclesPage() {
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchAcademicCycles();
      } else {
        // Redirect to login if not authenticated
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [user]); // Depend on user to refetch if user changes (e.g., logs in)

  const fetchAcademicCycles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'academicCycles'), orderBy('startDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const cycles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AcademicCycle[];
      setAcademicCycles(cycles);
    } catch (err: any) {
      console.error("Error al obtener los ciclos académicos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("Debes iniciar sesión para crear un ciclo académico.");
      return;
    }
    try {
      await addDoc(collection(db, 'academicCycles'), {
        name: cycleName,
        startDate,
        endDate,
        isActive: false, // New cycles are not active by default
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      setCycleName('');
      setStartDate('');
      setEndDate('');
      fetchAcademicCycles(); // Refresh the list
    } catch (err: any) {
      console.error("Error al crear el ciclo académico:", err);
      setError(err.message);
    }
  };

  const handleSetActive = async (cycleId: string) => {
    setError(null);
    try {
      const batch = writeBatch(db);

      // Deactivate all other cycles
      academicCycles.forEach((cycle) => {
        if (cycle.id !== cycleId && cycle.isActive) {
          const cycleRef = doc(db, 'academicCycles', cycle.id);
          batch.update(cycleRef, { isActive: false });
        }
      });

      // Activate the selected cycle
      const selectedCycleRef = doc(db, 'academicCycles', cycleId);
      batch.update(selectedCycleRef, { isActive: true });

      await batch.commit();
      fetchAcademicCycles(); // Refresh the list
    } catch (err: any) {
      console.error("Error al activar el ciclo:", err);
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

  return (
    <div className="container mx-auto p-4 bg-gray-100 dark:bg-gray-800 mt-14">
      <div className="">
        <form onSubmit={handleCreateCycle} className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Crear Nuevo Ciclo Académico</h2>
          <div className="mb-4">
            <label htmlFor="cycleName" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Nombre del Ciclo:</label>
            <input
              type="text"
              id="cycleName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Fecha de Inicio:</label>
            <input
              type="date"
              id="startDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Fecha de Fin:</label>
            <input
              type="date"
              id="endDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
          >
            Crear Ciclo
          </button>
        </form>

        <h2 className="text-xl font-semibold mb-4">Ciclos Académicos Existentes</h2>
        {academicCycles.length === 0 ? (
          <p>No se encontraron ciclos académicos.</p>
        ) : (
          <ul className="space-y-4">
            {academicCycles.map((cycle) => (
              <li key={cycle.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-bold">{cycle.name} {cycle.isActive && '(Activo)'}</p>
                  <p>Desde: {cycle.startDate} hasta {cycle.endDate}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Creado por: {cycle.createdBy} el {new Date(cycle.createdAt?.toDate()).toLocaleDateString()}</p>
                </div>
                {!cycle.isActive && (
                  <button
                    onClick={() => handleSetActive(cycle.id)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Marcar como Activo
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}