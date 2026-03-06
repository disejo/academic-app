/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, deleteDoc} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Icon from '@mdi/react';
import { mdiFileExcel } from '@mdi/js';
import { mdiFilePdfBox } from '@mdi/js';

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

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

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface AcademicCycle {
  id: string;
  name: string;
  isCurrent: boolean;
}

export default function PreceptorTopicBook() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Data states
    const [topics, setTopics] = useState<TopicBook[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
    const [currentCycle, setCurrentCycle] = useState<AcademicCycle | null>(null);

    // Filter states
    const [filterCycle, setFilterCycle] = useState<string>('');
    const [filterTeacher, setFilterTeacher] = useState<string>('');
    const [filterSubjectClassroom, setFilterSubjectClassroom] = useState<string>('');
    const [filterDate, setFilterDate] = useState<string>('');

    // Pagination states
    const [pageSize, setPageSize] = useState<number>(50);
    const [currentPage, setCurrentPage] = useState<number>(1);

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
            }
        } else {
            router.push('/login');
        }
        setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (user && role === 'PRECEPTOR') {
            fetchData();
        }
    }, [user, role]);

    useEffect(() => {
        if (topics.length > 0) {
            fetchAcademicCycles();
        }
    }, [topics]);

    useEffect(() => {
        // Reset subject-classroom filter when teacher changes
        setFilterSubjectClassroom('');
    }, [filterTeacher]);

    const fetchData = async () => {
        try {
            // First fetch topics, then academic cycles (which depends on topics)
            await fetchTopics();
            await Promise.all([
                fetchTeachers(),
                fetchSubjects(),
                fetchClassrooms()
            ]);
            // fetchAcademicCycles is called in useEffect when topics change
        } catch (err: any) {
            console.error('Error al cargar datos:', err);
            setError('Error al cargar los datos');
        }
    };

    const fetchTopics = async () => {
        try {
            const topicsRef = collection(db, 'topic_book');
            const snapshot = await getDocs(topicsRef);
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
        } catch (err: any) {
            console.error('Error al cargar temas:', err);
        }
    };

    const fetchTeachers = async () => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'DOCENTE'));
            const snapshot = await getDocs(q);
            const teachersData = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                email: doc.data().email
            }));
            setTeachers(teachersData);
        } catch (err: any) {
            console.error('Error al cargar docentes:', err);
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
            console.error('Error al cargar aulas:', err);
        }
    };

    const fetchAcademicCycles = async () => {
        try {
            const cyclesRef = collection(db, 'academicCycles');
            const snapshot = await getDocs(cyclesRef);
            const cyclesData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    isCurrent: data.isActive || false
                };
            });
            setAcademicCycles(cyclesData);
            const current = cyclesData.find(cycle => cycle.isCurrent);
            if (current) {
                setCurrentCycle(current);
                setFilterCycle(current.id);
            } else if (cyclesData.length > 0) {
                // If no current cycle, select the first one
                setCurrentCycle(cyclesData[0]);
                setFilterCycle(cyclesData[0].id);
            }
        } catch (err: any) {
            console.error('Error al cargar ciclos lectivos:', err);
        }
    };

    const clearFilters = () => {
        const current = academicCycles.find(cycle => cycle.isCurrent);
        setFilterCycle(current?.id || '');
        setFilterTeacher('');
        setFilterSubjectClassroom('');
        setFilterDate('');
        setCurrentPage(1);
    };

    const clearTable = async () => {
        if (confirm('¿Estás seguro de que quieres vaciar el libro de temas?\nEsta acción no se puede deshacer, todo los datos se perderán.')) {
            try {
                setLoading(true);
                const topicsRef = collection(db, 'topic_book');
                const snapshot = await getDocs(topicsRef);
                
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                
                setTopics([]);
                setSuccess('Todos los temas han sido eliminados exitosamente');
                setTimeout(() => setSuccess(null), 3000);
            } catch (err: any) {
                console.error('Error al eliminar temas:', err);
                setError('Error al eliminar los temas');
                setTimeout(() => setError(null), 3000);
            } finally {
                setLoading(false);
            }
        }
    };

    // Filter and paginate topics
    const filteredTopics = topics.filter(topic => {
        const matchesCycle = !filterCycle || topic.academicCycleId === filterCycle;
        const matchesTeacher = !filterTeacher || topic.teacherId === filterTeacher;
        const matchesSubjectClassroom = !filterSubjectClassroom || `${topic.subjectId}-${topic.classroomId}` === filterSubjectClassroom;
        const matchesDate = !filterDate || topic.date.toISOString().split('T')[0] === filterDate;
        
        return matchesCycle && matchesTeacher && matchesSubjectClassroom && matchesDate;
    });

    const totalPages = Math.ceil(filteredTopics.length / pageSize);
    const paginatedTopics = filteredTopics.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const getTeacherName = (teacherId: string) => {
        const teacher = teachers.find(t => t.id === teacherId);
        return teacher ? teacher.name : 'Desconocido';
    };

    const getSubjectName = (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name : 'Desconocida';
    };

    const getClassroomName = (classroomId: string) => {
        const classroom = classrooms.find(c => c.id === classroomId);
        return classroom ? classroom.name : 'Desconocida';
    };

    const getSubjectClassroomOptions = (selectedTeacher?: string) => {
        const uniqueCombinations = new Set<string>();
        const options: { value: string; label: string }[] = [];
        
        // Filter topics by selected teacher if one is selected
        const relevantTopics = selectedTeacher 
            ? topics.filter(topic => topic.teacherId === selectedTeacher)
            : topics;
        
        relevantTopics.forEach(topic => {
            const combination = `${topic.subjectId}-${topic.classroomId}`;
            if (!uniqueCombinations.has(combination)) {
                uniqueCombinations.add(combination);
                const subjectName = getSubjectName(topic.subjectId);
                const classroomName = getClassroomName(topic.classroomId);
                options.push({
                    value: combination,
                    label: `${subjectName} - ${classroomName}`
                });
            }
        });
        
        return options.sort((a, b) => a.label.localeCompare(b.label));
    };

    const getCycleName = (cycleId: string) => {
        const cycle = academicCycles.find(c => c.id === cycleId);
        return cycle ? cycle.name : 'Desconocido';
    };

    const handleDownloadExcel = () => {
        const data = paginatedTopics.map((topic) => ({
            Fecha: `${topic.date.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })} a las ${topic.date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })} hs`,
            Docente: getTeacherName(topic.teacherId),
            Asignatura: getSubjectName(topic.subjectId),
            Aula: getClassroomName(topic.classroomId),
            'Tiempo de Clase': `${topic.classTime} min`,
            Tema: topic.topic,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Libro de Temas");
        const fileName = `libro-temas-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        const tableColumn = [
            "Fecha y Hora", 
            "Docente", 
            "Asignatura", 
            "Aula", 
            "Tiempo de Clase", 
            "Tema"
        ];
        const tableRows: any[] = [];

        paginatedTopics.forEach((topic) => {
            const fechaHora = `${topic.date.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })} a las ${topic.date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })} hs`;
            
            const row = [
                fechaHora,
                getTeacherName(topic.teacherId),
                getSubjectName(topic.subjectId),
                getClassroomName(topic.classroomId),
                `${topic.classTime} min`,
                topic.topic,
            ];
            tableRows.push(row);
        });

        const title = `Libro de Temas - ${new Date().toLocaleDateString('es-ES')}`;
        doc.text(title, 14, 15);
        autoTable(doc, { 
            head: [tableColumn], 
            body: tableRows, 
            startY: 25,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 40 }, // Fecha y Hora más ancha
                5: { cellWidth: 45 }  // Tema más ancho
            }
        });
        const fileName = `libro-temas-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
            <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="w-full mt-14 p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-800 min-h-screen text-gray-900 dark:text-gray-100">
        <div className="w-full">
        
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Libro de Temas - Preceptor</h1>
            <p className="text-gray-600 dark:text-gray-300">Visualización de temas registrados por docentes</p>
        </div>
        
        {error && <p className="text-red-500 text-center mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-md">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-md">{success}</p>}
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ciclo Lectivo
                    </label>
                    <select
                        value={filterCycle}
                        onChange={(e) => setFilterCycle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:text-white"
                    >
                        <option value="">Todos los ciclos</option>
                        {academicCycles.map(cycle => (
                            <option key={cycle.id} value={cycle.id}>
                                {cycle.name} {cycle.isCurrent ? '(Actual)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Docente
                    </label>
                    <select
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:text-white"
                    >
                        <option value="">Todos los docentes</option>
                        {teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Asignatura - Aula
                    </label>
                    <select
                        value={filterSubjectClassroom}
                        onChange={(e) => setFilterSubjectClassroom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:text-white"
                    >
                        <option value="">Todas las asignaturas</option>
                        {getSubjectClassroomOptions(filterTeacher).map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha
                    </label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:text-white"
                    />
                </div>
                
                <div className="flex items-end gap-2">
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mostrar filas
                        </label>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-600 dark:text-white"
                        >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                            <option value={1000}>1000</option>
                            <option value={filteredTopics.length}>Todas</option>
                        </select>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        Mostrando {paginatedTopics.length} de {filteredTopics.length} temas
                    </div>
                </div>
            </div>
        </div>
                {/* Table Footer with Export Buttons and Delete Button */}
        <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors duration-200"
                    title="Exportar a Excel"
                >
                    <Icon path={mdiFileExcel} size={0.8} />
                    Excel
                </button>
                <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                    title="Exportar a PDF"
                >
                    <Icon path={mdiFilePdfBox} size={0.8} />
                    PDF
                </button>
            </div>
            
            <button
                onClick={clearTable}
                className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                title="Eliminar todos los temas (acción irreversible)"
            >
                🗑️ Eliminar tabla completa
            </button>
        </div>
        {/* Table */}
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-600">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Docente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Asignatura
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Aula
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Tiempo de Clase
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Tema
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Ciclo Lectivo
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                        {paginatedTopics.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-300">
                                    No se encontraron temas con los filtros aplicados
                                </td>
                            </tr>
                        ) : (
                            paginatedTopics.map((topic) => (
                                <tr key={topic.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {topic.date.toLocaleDateString('es-ES', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })} a las {topic.date.toLocaleTimeString('es-ES', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })} hs
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {getTeacherName(topic.teacherId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {getSubjectName(topic.subjectId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {getClassroomName(topic.classroomId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {topic.classTime} min
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                        {topic.topic}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {getCycleName(topic.academicCycleId)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    
        
        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex justify-center mt-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Página {currentPage} de {totalPages}
                    </span>
                    
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        )}

        </div>
        </div>
    );
}