/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';

import DocenteAssignedSubjects from '@/components/topic-book/_components/DocentesAssignedSubjects';
import DocenteListBook from '@/components/topic-book/_components/DocenteListBook';
import DocenteInformacion from '@/components/topic-book/_components/DocenteInformacion';


interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface Subject {
  id: string;
  name: string;
  classrooms: Classroom[];
}

interface Classroom {
  id: string;
  name: string;
}

interface AcademicCycle {
  id: string;
  name: string;
}
export default function DocenteTopicBook() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [academicCycle, setAcademicCycle] = useState<AcademicCycle | null>(null);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [date, setDate] = useState('');
    const [tiempo, setTiempo] = useState('');
    const [tema, setTema] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setName(currentUser.displayName || '');
            setEmail(currentUser.email || '');
            
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            if (userData.role === 'DOCENTE') {
              fetchSubjects(currentUser.uid);
              fetchActiveCycle();
            }
            }
        } else {
            router.push('/login');
        }
        setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const fetchSubjects = async (uid: string) => {
      try {
        const subjectsRef = collection(db, 'subjects');
        const subjectQueries = [
          query(subjectsRef, where('titularId', '==', uid)),
          query(subjectsRef, where('auxiliarId', '==', uid)),
          query(subjectsRef, where('suplenteId', '==', uid))
        ];
        const querySnapshots = await Promise.all(subjectQueries.map(q => getDocs(q)));
        
        const uniqueSubjects = new Map<string, any>();
        querySnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            if (!uniqueSubjects.has(doc.id)) {
              uniqueSubjects.set(doc.id, { id: doc.id, ...doc.data() });
            }
          });
        });
        const initialSubjects = Array.from(uniqueSubjects.values());

        if (initialSubjects.length === 0) {
          setSubjects([]);
          return;
        }

        // Step 2: Fetch all classroom-subject relations for these subjects
        const subjectIds = initialSubjects.map(s => s.id);
        const classroomSubjectsRef = collection(db, 'classroom_subjects');
        const relationsQuery = query(classroomSubjectsRef, where('subjectId', 'in', subjectIds));
        const relationsSnapshot = await getDocs(relationsQuery);

        const subjectToClassroomIds = new Map<string, string[]>();
        relationsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const subjectId = data.subjectId;
          const classroomId = data.classroomId;
          if (!subjectToClassroomIds.has(subjectId)) {
            subjectToClassroomIds.set(subjectId, []);
          }
          subjectToClassroomIds.get(subjectId)?.push(classroomId);
        });

        // Step 3: Fetch details for all unique classrooms
        const allClassroomIds = [...new Set(Array.from(subjectToClassroomIds.values()).flat())];
        const classroomsMap = new Map<string, string>();

        if (allClassroomIds.length > 0) {
          const classroomChunks = [];
          for (let i = 0; i < allClassroomIds.length; i += 30) {
              classroomChunks.push(allClassroomIds.slice(i, i + 30));
          }

          const classroomPromises = classroomChunks.map(chunk => 
              getDocs(query(collection(db, 'classrooms'), where('__name__', 'in', chunk)))
          );
          
          const classroomSnapshots = await Promise.all(classroomPromises);

          classroomSnapshots.forEach(snapshot => {
              snapshot.forEach(doc => {
                  classroomsMap.set(doc.id, doc.data().name || 'Nombre no encontrado');
              });
          });
        }

        // Step 4: Combine data
        const finalSubjects = initialSubjects.map(subject => {
          const classroomIds = subjectToClassroomIds.get(subject.id) || [];
          const classrooms = classroomIds.map(id => ({
            id,
            name: classroomsMap.get(id) || 'Nombre no encontrado'
          })).filter(c => c.name !== 'Nombre no encontrado');
          
          return { ...subject, classrooms };
        });

        setSubjects(finalSubjects as Subject[]);
      } catch (err) {
        setError('Error al cargar asignaturas');
      }
    };

    const fetchActiveCycle = async () => {
      try {
        const cyclesRef = collection(db, 'academicCycles');
        const q = query(cyclesRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setAcademicCycle({ id: doc.id, name: doc.data().name });
        }
      } catch (err) {
        setError('Error al cargar ciclo activo');
      }
    };
    // Prellenar fecha y tiempo al cargar el componente por primera vez
    useEffect(() => {
        const now = new Date();
        // Formatear a "YYYY-MM-DDTHH:mm"
        const formatted = now.toLocaleString('sv-SE').slice(0,16);
        setDate(formatted);
        setTiempo('40');
    }, []);

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!academicCycle || !selectedSubject) {
        setError('Selecciona asignatura y clase, y asegúrate de que hay un ciclo activo');
        return;
      }
      setFormLoading(true);
      try {
        const [subjectId, classroomId] = selectedSubject.split('-');
        await addDoc(collection(db, 'topic_book'), {
          academicCycleId: academicCycle.id,
          teacherId: user!.uid,
          subjectId: subjectId,
          classroomId: classroomId,
          date: new Date(date),
          classTime: parseInt(tiempo),
          topic: tema
        });
        setSuccess('Tema agregado exitosamente');
        setSelectedSubject('');
        // Reiniciar a fecha actual formateada
        const now = new Date();
        const formatted = now.toLocaleString('sv-SE').slice(0,16);
        setDate(formatted);
        // Reiniciar a 40 minutos
        setTiempo('40');    
        setTema('');
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        setError('Error al agregar tema');
      } finally {
        setFormLoading(false);
      }
    };

    useEffect(() => {
        // Simulate loading for the main dashboard, as sub-components fetch their own data
        const timer = setTimeout(() => {
        setLoading(false);
        }, 1000); // Simulate a 1-second loading time

        return () => clearTimeout(timer);
    }, []);


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
            <LoadingSpinner />
            </div>
        );
    }

    return (
    <div className="w-full mt-14 p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
      <div className="mx-auto">
        
        {error && <p className="text-red-500 text-center mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-md">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-md">{success}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white dark:bg-gray-900 p-8 rounded-md shadow-md text-gray-700 dark:text-white">
        {/* Columna Izquierda */}
        <div className="flex flex-col gap-10">
            <DocenteInformacion user={user} refreshTrigger={refreshTrigger} />
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col gap-10">
            <DocenteAssignedSubjects user={user} role="DOCENTE" />
        </div>
        </div>
        {/* Agregar Nuevo Tema */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md mt-10">
          <h2 className="text-2xl font-semibold mb-4">Agregar Nuevo Tema</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asignatura:</label>
                <select
                  id="subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Selecciona asignatura y clase</option>
                  {subjects.flatMap(subject => 
                    subject.classrooms.map(classroom => (
                      <option key={`${subject.id}-${classroom.id}`} value={`${subject.id}-${classroom.id}`}>
                        {subject.name} - {classroom.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
                <input
                  type="datetime-local"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                /> 
              </div>
              <div>
                <label htmlFor="tiempo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tiempo de clase (minutos):</label>
                <input
                  type="number"
                  id="tiempo"
                  value={tiempo}
                  onChange={(e) => setTiempo(e.target.value)}
                  required
                  min="40"
                  step="40"
                  placeholder='Duración de la clase'
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="tema" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tema de clase:</label>
                <textarea
                  id="tema"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  required
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {formLoading ? 'Agregando...' : 'Agregar Tema'}
            </button>
          </form>
        </div>
        {/* Lista de Temas */}
        <DocenteListBook user={user} role={role} refreshTrigger={refreshTrigger} onUpdate={() => setRefreshTrigger(prev => prev + 1)} />
    </div>
    </div>
    );
}