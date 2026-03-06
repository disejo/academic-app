/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface TopicBook {
  id: string;
  academicCycleId: string;
  teacherId: string;
  subjectId: string;
  classroomId: string;
  date: Date;
  classTime: number;
  topic: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface DocenteListBookProps {
  user: User | null;
  role: string | null;
  refreshTrigger?: number;
  onUpdate?: () => void;
}

export default function DocenteListBook({ user, role, refreshTrigger = 0, onUpdate }: DocenteListBookProps) {
  const [topics, setTopics] = useState<TopicBook[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<TopicBook | null>(null);
  const [editForm, setEditForm] = useState({ date: '', tiempo: '', tema: '' });

  useEffect(() => {
    if (user) {
      fetchTopics();
      fetchSubjects();
      fetchClassrooms();
    }
  }, [user, refreshTrigger]);

  const fetchTopics = async () => {
    try {
      const topicsRef = collection(db, 'topic_book');
      const q = query(topicsRef, where('teacherId', '==', user!.uid));
      const snapshot = await getDocs(q);
      const topicsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          academicCycleId: data.academicCycleId,
          teacherId: data.teacherId,
          subjectId: data.subjectId,
          classroomId: data.classroomId,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          classTime: data.classTime,
          topic: data.topic
        } as TopicBook;
      }).sort((a, b) => b.date.getTime() - a.date.getTime());
      setTopics(topicsData);
      setLoading(false);
    } catch (err: any) {
      console.error('Error detallado:', err);
      setError(`Error al cargar temas: ${err.message || 'Error desconocido'}`);
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const subjectsRef = collection(db, 'subjects');
      const snapshot = await getDocs(subjectsRef);
      const subjectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setSubjects(subjectsData);
    } catch (err: any) {
      console.error('Error al cargar asignaturas:', err);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const classroomsRef = collection(db, 'classrooms');
      const snapshot = await getDocs(classroomsRef);
      const classroomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setClassrooms(classroomsData);
    } catch (err: any) {
      console.error('Error al cargar clases:', err);
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Desconocida';
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.name : 'Desconocida';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este tema?')) return;
    try {
      await deleteDoc(doc(db, 'topic_book', id));
      setTopics(topics.filter(t => t.id !== id));
      setSuccess('Tema eliminado exitosamente');
      onUpdate?.();
    } catch (err) {
      setError('Error al eliminar tema');
    }
  };

  const handleEdit = (topic: TopicBook) => {
    setEditingTopic(topic);
    // Convertir fecha al formato correcto para datetime-local (YYYY-MM-DDTHH:mm)
    const dateValue = topic.date.toLocaleString('sv-SE').slice(0, 16);
    setEditForm({
      date: dateValue,
      tiempo: topic.classTime.toString(),
      tema: topic.topic
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    try {
      const newDate = new Date(editForm.date);
      await updateDoc(doc(db, 'topic_book', editingTopic.id), {
        date: newDate,
        classTime: parseInt(editForm.tiempo),
        topic: editForm.tema
      });
      setTopics(topics.map(t => t.id === editingTopic.id ? { ...t, date: newDate, classTime: parseInt(editForm.tiempo), topic: editForm.tema } : t).sort((a, b) => b.date.getTime() - a.date.getTime()));
      setSuccess('Tema actualizado exitosamente');
      setEditingTopic(null);
      onUpdate?.();
    } catch (err: any) {
      console.error('Error al actualizar:', err);
      setError(`Error al actualizar tema: ${err.message || 'Error desconocido'}`);
    }
  };

  const canModify = role === 'DOCENTE' || role === 'DIRECTIVO';

  if (loading) {
    return <div className="text-center p-4">Cargando temas...</div>;
  }

  if (topics.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mt-10">
        <h2 className="text-2xl font-semibold mb-4">Libro de Temas</h2>
        <p className="text-gray-600 dark:text-gray-400">No hay temas registrados aún.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-semibold mb-4">Libro de Temas</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-600">
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Asignatura</th>
              <th className="px-4 py-2 text-left">Clase</th>
              <th className="px-4 py-2 text-left">Tiempo (min)</th>
              <th className="px-4 py-2 text-left">Tema</th>
              {canModify && <th className="px-4 py-2 text-left">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {topics.map(topic => (
              <tr key={topic.id} className="border-b dark:border-gray-600">
                <td className="px-4 py-2">{topic.date.toLocaleDateString()}&nbsp;{topic.date.toTimeString().slice(0, 5)}</td>
                <td className="px-4 py-2">{getSubjectName(topic.subjectId)}</td>
                <td className="px-4 py-2">{getClassroomName(topic.classroomId)}</td>
                <td className="px-4 py-2">{topic.classTime}</td>
                <td className="px-4 py-2">{topic.topic}</td>
                {canModify && (
                  <td className="px-4 py-2">
                    <button onClick={() => handleEdit(topic)} className="text-blue-500 mr-4 cursor-pointer">Editar</button>
                    <button onClick={() => handleDelete(topic.id)} className="text-red-500 cursor-pointer">X</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Editar Tema</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium dark:text-gray-300">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium dark:text-gray-300">Tiempo (min)</label>
                <input
                  type="number"
                  value={editForm.tiempo}
                  onChange={(e) => setEditForm({ ...editForm, tiempo: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium dark:text-gray-300">Tema</label>
                <textarea
                  value={editForm.tema}
                  onChange={(e) => setEditForm({ ...editForm, tema: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingTopic(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
