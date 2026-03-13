'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import FilterSelect from '@/components/FilterSelect';
import jsPDF from 'jspdf';

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const router = useRouter();
  
  // fetch names for resolving IDs
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [cycles, setCycles] = useState<Record<string, string>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Enforce role
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'DIRECTIVO' || userData.role === 'PRECEPTOR') {
              fetchData();
            } else {
              router.push('/dashboard'); // unauthorized
            }
          } else {
            router.push('/login');
          }
        } catch (err) {
          console.error("Error verifying role:", err);
          router.push('/login');
        }
      } else {
         router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchData = async () => {
    try {
      // Fetch Subjects
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const sMap: Record<string, string> = {};
      subjectsSnapshot.docs.forEach(d => {
        sMap[d.id] = d.data().name;
      });
      setSubjects(sMap);

      // Fetch Cycles
      const cyclesSnapshot = await getDocs(collection(db, 'academicCycles'));
      const cMap: Record<string, string> = {};
      cyclesSnapshot.docs.forEach(d => {
        cMap[d.id] = d.data().name;
      });
      setCycles(cMap);

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const uMap: Record<string, string> = {};
      usersSnapshot.docs.forEach(d => {
        const data = d.data();
        if (data.role === 'DOCENTE') {
          uMap[d.id] = data.name || data.email || d.id;
        }
      });
      setUsersMap(uMap);

      // Fetch Programs
      const programsSnapshot = await getDocs(collection(db, 'programs'));
      const programsData = programsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setPrograms(programsData);

    } catch (err: any) {
      console.error("Error fetching data:", err);
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

  const teacherOptions = Object.entries(usersMap).map(([id, name]) => ({
    id,
    name
  }));

  const filteredPrograms = selectedTeacherId 
    ? programs.filter(p => p.teacherId === selectedTeacherId)
    : programs;

  const handleExportPDF = () => {
    if (!selectedProgram) return;

    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      const teacherName = usersMap[selectedTeacherId || selectedProgram.teacherId] || selectedProgram.teacherId;
      const subjectName = subjects[selectedProgram.subjectId] || selectedProgram.subjectId;
      const cycleName = cycles[selectedProgram.academicCycleId] || selectedProgram.academicCycleId;
      const title = selectedProgram.title || 'Programa sin título';

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, 40, 60);

      // Metadata
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Docente: ${teacherName}`, 40, 90);
      pdf.text(`Asignatura: ${subjectName}`, 40, 110);
      pdf.text(`Ciclo Académico: ${cycleName}`, 40, 130);
      
      // Separator Line
      pdf.setLineWidth(0.5);
      pdf.line(40, 145, 550, 145);

      // Content Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Contenido:", 40, 175);

      // Body format
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");

      // Strip HTML simply for PDF text layout
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = selectedProgram.content || "";
      const cleanText = tempDiv.innerText || tempDiv.textContent || "";
      
      const lines = pdf.splitTextToSize(cleanText, 510);
      pdf.text(lines, 40, 200);

      pdf.save(`Programa_${subjectName.replace(/\s+/g, '_')}_${teacherName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Hubo un error al generar el PDF.');
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-800 pt-16 min-h-screen">
      <div className="dark:text-amber-50 text-gray-700">
        <div className="sticky top-[56px] z-30 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between mb-8">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Programas Académicos (Admin)</h1>
          <div className="w-full md:w-1/3">
            <FilterSelect
              options={teacherOptions}
              optionLabelKey="name"
              optionValueKey="id"
              onSelect={(selected: any) => {
                setSelectedTeacherId(selected ? selected.id : null);
                setSelectedProgram(null);
              }}
              placeholder="Filtrar por Docente..."
              initialValue={selectedTeacherId ? { id: selectedTeacherId, name: usersMap[selectedTeacherId as string] } : undefined}
            />
          </div>
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border-r pr-4">
            <h2 className="text-xl font-semibold mb-4">Lista de Programas</h2>
            {!selectedTeacherId ? (
              <p className="text-gray-500 italic">Seleccione un docente para ver sus programas.</p>
            ) : filteredPrograms.length === 0 ? (
              <p>No se encontraron programas para este docente.</p>
            ) : (
              <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                {filteredPrograms.map((prog) => (
                  <li 
                    key={prog.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition ${selectedProgram?.id === prog.id ? 'bg-teal-100 dark:bg-teal-900 border-teal-500' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                    onClick={() => setSelectedProgram(prog)}
                  >
                    <p className="font-bold">{prog.title || 'Sin Título'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Docente: {usersMap[prog.teacherId] || prog.teacherId}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Asignatura: {subjects[prog.subjectId] || 'Desconocida'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Ciclo: {cycles[prog.academicCycleId] || 'Desconocido'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="md:col-span-2">
            {selectedProgram ? (
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md max-h-[80vh] overflow-y-auto relative">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold pr-20">{selectedProgram.title || 'Programa sin título'}</h2>
                  <button
                    onClick={handleExportPDF}
                    className="absolute top-6 right-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center gap-2 text-sm z-10"
                  >
                    Exportar a PDF
                  </button>
                </div>

                {/* Content to be exported as PDF visually */}
                <div id="pdf-content" className="bg-white dark:bg-gray-700 p-6 mt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="mb-4 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-500 pb-4">
                    <p><strong>Docente:</strong> {usersMap[selectedProgram.teacherId] || selectedProgram.teacherId}</p>
                    <p><strong>Asignatura:</strong> {subjects[selectedProgram.subjectId] || selectedProgram.subjectId}</p>
                    <p><strong>Ciclo Académico:</strong> {cycles[selectedProgram.academicCycleId] || selectedProgram.academicCycleId}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Contenido:</h3>
                    <div 
                      className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100"
                      dangerouslySetInnerHTML={{ __html: selectedProgram.content }}
                    />
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md h-full min-h-[300px]">
                <p>Seleccione un programa de la lista para ver sus detalles.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
