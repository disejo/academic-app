/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

interface DocenteInformacionProps {
  user: User | null;
  refreshTrigger?: number;
}

export default function DocenteInformacion({ user, refreshTrigger = 0 }: DocenteInformacionProps) {
  const [latestTopic, setLatestTopic] = useState<TopicBook | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [classroomName, setClassroomName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLatestTopic();
    }
  }, [user, refreshTrigger]);

  const fetchLatestTopic = async () => {
    try {
      const topicsRef = collection(db, 'topic_book');
      const q = query(topicsRef, where('teacherId', '==', user!.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
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

        if (topicsData.length > 0) {
          setLatestTopic(topicsData[0]);
          fetchSubjectName(topicsData[0].subjectId);
          fetchClassroomName(topicsData[0].classroomId);
        }
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error al cargar último tema:', err);
      setLoading(false);
    }
  };

  const fetchSubjectName = async (subjectId: string) => {
    try {
      const subjectsRef = collection(db, 'subjects');
      const snapshot = await getDocs(subjectsRef);
      const foundSubject = snapshot.docs.find(doc => doc.id === subjectId);
      if (foundSubject) {
        setSubjectName(foundSubject.data().name);
      }
    } catch (err) {
      console.error('Error al cargar asignatura:', err);
    }
  };

  const fetchClassroomName = async (classroomId: string) => {
    try {
      const classroomsRef = collection(db, 'classrooms');
      const snapshot = await getDocs(classroomsRef);
      const foundClassroom = snapshot.docs.find(doc => doc.id === classroomId);
      if (foundClassroom) {
        setClassroomName(foundClassroom.data().name);
      }
    } catch (err) {
      console.error('Error al cargar clase:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md flex-1 min-w-[200px]">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-lg shadow-md flex-1 min-w-[200px] border-l-4 border-indigo-500">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 dark:bg-indigo-600">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Último Tema Agregado</h2>
          {latestTopic ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                <span className="font-medium">Última actualización:</span>{' '}
                {latestTopic.date.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-indigo-600 dark:text-indigo-300">
                <span className="font-medium">Última asignatura agregada:</span>{' '}
                <span className="font-semibold text-indigo-700 dark:text-indigo-200">{subjectName || 'Cargando...'}</span>
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-300">
                <span className="font-medium">Clase:</span>{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-200">{classroomName || 'Cargando...'}</span>
              </p>
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 italic">
              No hay temas registrados aún. ¡Comienza agregando tu primer tema!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}