'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Subject {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  createdBy: string;
  titularId?: string;
  suplenteId?: string;
  auxiliarId?: string;
  titularName?: string;
  suplenteName?: string;
  auxiliarName?: string;
}

interface Teacher {
  id: string;
  name: string;
}

export default function SubjectsPage() {
  const [subjectName, setSubjectName] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTitularId, setSelectedTitularId] = useState<string>('');
  const [selectedSuplenteId, setSelectedSuplenteId] = useState<string>('');
  const [selectedAuxiliarId, setSelectedAuxiliarId] = useState<string>('');

  // State for editing
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchSubjects();
        fetchTeachers();
      } else {
        // Redirect to login if not authenticated
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'DOCENTE'));
      const querySnapshot = await getDocs(q);
      const fetchedTeachers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Teacher[];
      setTeachers(fetchedTeachers);
    } catch (err: any) {
      console.error("Error fetching teachers:", err);
      setError(err.message);
    }
  };

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedSubjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subject[];

      const subjectsWithTeacherNames = await Promise.all(fetchedSubjects.map(async (subject) => {
        let titularName = '';
        let suplenteName = '';
        let auxiliarName = '';
        if (subject.titularId) {
          try {
            const teacherDocRef = doc(db, 'users', subject.titularId);
            const teacherDocSnap = await getDoc(teacherDocRef);
            titularName = teacherDocSnap.exists() ? teacherDocSnap.data().name : 'Desconocido';
          } catch {
            titularName = 'Desconocido';
          }
        }
        if (subject.suplenteId) {
          try {
            const teacherDocRef = doc(db, 'users', subject.suplenteId);
            const teacherDocSnap = await getDoc(teacherDocRef);
            suplenteName = teacherDocSnap.exists() ? teacherDocSnap.data().name : 'Desconocido';
          } catch {
            suplenteName = 'Desconocido';
          }
        }
        if (subject.auxiliarId) {
          try {
            const teacherDocRef = doc(db, 'users', subject.auxiliarId);
            const teacherDocSnap = await getDoc(teacherDocRef);
            auxiliarName = teacherDocSnap.exists() ? teacherDocSnap.data().name : 'Desconocido';
          } catch {
            auxiliarName = 'Desconocido';
          }
        }
        return { ...subject, titularName, suplenteName, auxiliarName };
      }));

      setSubjects(subjectsWithTeacherNames);
    } catch (err: any) {
      console.error("Error al obtener asignaturas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("Debes iniciar sesión para crear una asignatura.");
      return;
    }
    try {
      await addDoc(collection(db, 'subjects'), {
        name: subjectName,
        description: subjectDescription,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        titularId: selectedTitularId || null,
        suplenteId: selectedSuplenteId || null,
        auxiliarId: selectedAuxiliarId || null,
      });
      setSubjectName('');
      setSubjectDescription('');
      setSelectedTitularId('');
      setSelectedSuplenteId('');
      setSelectedAuxiliarId('');
      fetchSubjects();
    } catch (err: any) {
      console.error("Error al crear asignatura:", err);
      setError(err.message);
    }
  };

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (subjectId: string) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await deleteDoc(doc(db, 'subjects', subjectId));
        fetchSubjects();
      } catch (err: any) {
        console.error("Error deleting subject: ", err);
        setError(err.message);
      }
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    try {
      const subjectRef = doc(db, 'subjects', editingSubject.id);
      await updateDoc(subjectRef, {
        name: editingSubject.name,
        description: editingSubject.description,
        titularId: editingSubject.titularId || null,
        suplenteId: editingSubject.suplenteId || null,
        auxiliarId: editingSubject.auxiliarId || null,
      });
      setIsModalOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (err: any) {
      console.error("Error al actualizar asignatura: ", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando asignaturas...</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow-md dark:bg-gray-900 dark:text-amber-50">
        <h1 className="text-2xl font-bold mb-6 text-center">Gestión de Asignaturas</h1>

        <form onSubmit={handleCreateSubject} className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Crear nueva asignatura</h2>
          <div className="mb-4">
            <label htmlFor="subjectName" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Nombre de la asignatura:</label>
            <input
              type="text"
              id="subjectName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="subjectDescription" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Descripción (opcional):</label>
            <textarea
              id="subjectDescription"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={subjectDescription}
              onChange={(e) => setSubjectDescription(e.target.value)}
              rows={3}
            ></textarea>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Docente titular:</label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedTitularId}
              onChange={(e) => setSelectedTitularId(e.target.value)}
            >
              <option value="">-- Selecciona un docente titular (opcional) --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Docente suplente:</label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedSuplenteId}
              onChange={(e) => setSelectedSuplenteId(e.target.value)}
            >
              <option value="">-- Selecciona un docente suplente (opcional) --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Docente auxiliar:</label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
              value={selectedAuxiliarId}
              onChange={(e) => setSelectedAuxiliarId(e.target.value)}
            >
              <option value="">-- Selecciona un docente auxiliar (opcional) --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer"
          >
            Crear asignatura
          </button>
        </form>

        <h2 className="text-xl font-semibold mb-4">Asignaturas existentes</h2>
        {subjects.length === 0 ? (
          <p>No se encontraron asignaturas.</p>
        ) : (
          <ul className="space-y-4">
            {subjects.map((subject) => (
              <li key={subject.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-bold">{subject.name}</p>
                  {subject.description && <p>{subject.description}</p>}
                  <p className="text-sm text-gray-600 dark:text-gray-400">Titular: {subject.titularName || 'N/A'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Suplente: {subject.suplenteName || 'N/A'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Auxiliar: {subject.auxiliarName || 'N/A'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Creado por: {subject.createdBy} el {subject.createdAt?.toDate ? new Date(subject.createdAt?.toDate()).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEditClick(subject)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Editar</button>
                  <button onClick={() => handleDeleteClick(subject.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md dark:bg-gray-900 dark:text-amber-50">
            <h2 className="text-2xl font-bold mb-4">Editar asignatura</h2>
            <form onSubmit={handleUpdateSubject}>
              <div className="mb-4">
                <label htmlFor="editSubjectName" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Nombre de la asignatura:</label>
                <input
                  type="text"
                  id="editSubjectName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="editSubjectDescription" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Descripción (opcional):</label>
                <textarea
                  id="editSubjectDescription"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                  value={editingSubject.description}
                  onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })}
                  rows={3}
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Docente titular:</label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                  value={editingSubject.titularId || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, titularId: e.target.value })}
                >
                  <option value="">-- Selecciona un docente titular (opcional) --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Docente suplente:</label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                  value={editingSubject.suplenteId || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, suplenteId: e.target.value })}
                >
                  <option value="">-- Selecciona un docente suplente (opcional) --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">Docente auxiliar:</label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-amber-50 dark:border-gray-600"
                  value={editingSubject.auxiliarId || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, auxiliarId: e.target.value })}
                >
                  <option value="">-- Selecciona un docente auxiliar (opcional) --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}