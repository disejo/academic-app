"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import Icon from '@mdi/react';
import { mdiFilePdfBox } from '@mdi/js';
import FilterSelect from "@/components/FilterSelect";

// Interfaces
interface Grade {
  subjectId: string;
  trimester1: number;
  trimester2: number;
  trimester3: number;
}

interface AcademicCycle {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  dni: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function EstudentUserGrade() {
  // Estados
  const [student, setStudent] = useState<Student | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Efecto para cargar datos iniciales (estudiantes y ciclos)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const cyclesQuery = query(collection(db, "academicCycles"));
        const cyclesSnapshot = await getDocs(cyclesQuery);
        const cycles: AcademicCycle[] = cyclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicCycle));
        setAcademicCycles(cycles);

        const studentsQuery = query(collection(db, "users"), where("role", "==", "ESTUDIANTE"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentList: Student[] = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setAllStudents(studentList);
      } catch {
        setError("No se pudieron cargar los datos iniciales.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Efecto para buscar datos del estudiante cuando se selecciona un estudiante o un ciclo
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!student || !selectedCycleId) {
        // Si no hay estudiante o ciclo, limpiamos los datos para evitar mostrar información incorrecta
        setGrades([]);
        setSubjects([]);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const enrollQ = query(
          collection(db, "classroom_enrollments"),
          where("studentId", "==", student.id),
          where("academicCycleId", "==", selectedCycleId)
        );
        const enrollSnap = await getDocs(enrollQ);
        if (enrollSnap.empty) throw new Error("No se encontró clase para el estudiante en el ciclo seleccionado");

        const classroomId = enrollSnap.docs[0].data().classroomId;
        const classroomSubjectsQ = query(collection(db, "classroom_subjects"), where("classroomId", "==", classroomId));
        const classroomSubjectsSnap = await getDocs(classroomSubjectsQ);
        const subjectIds = classroomSubjectsSnap.docs.map(doc => doc.data().subjectId);

        if (subjectIds.length === 0) {
          setSubjects([]);
          setGrades([]);
          return;
        }

        const subjectsData: Subject[] = [];
        for (const subjectId of subjectIds) {
          const subjectDoc = await getDocs(query(collection(db, "subjects"), where("name", ">", "")));
          const subjectSnap = subjectDoc.docs.find(doc => doc.id === subjectId);
          if (subjectSnap) {
            subjectsData.push({ id: subjectSnap.id, name: subjectSnap.data().name });
          }
        }
        setSubjects(subjectsData);

        const gradesQ = query(collection(db, "grades"), where("studentId", "==", student.id), where("academicCycleId", "==", selectedCycleId));
        const gradesSnapshot = await getDocs(gradesQ);
        const gradesMap: Record<string, { subjectId: string; trimester1?: number; trimester2?: number; trimester3?: number }> = {};
        gradesSnapshot.forEach(doc => {
          const data = doc.data();
          if (!subjectIds.includes(data.subjectId)) return;
          if (!gradesMap[data.subjectId]) gradesMap[data.subjectId] = { subjectId: data.subjectId };
          if (data.trimester === 1) gradesMap[data.subjectId].trimester1 = data.grade;
          if (data.trimester === 2) gradesMap[data.subjectId].trimester2 = data.grade;
          if (data.trimester === 3) gradesMap[data.subjectId].trimester3 = data.grade;
        });
        setGrades(Object.values(gradesMap).map(g => ({ subjectId: g.subjectId, trimester1: g.trimester1 || 0, trimester2: g.trimester2 || 0, trimester3: g.trimester3 || 0 })));
      } catch (err: any) {
        setError(err.message || "Error al buscar datos del estudiante");
        setGrades([]);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [student, selectedCycleId]);

  // Funciones auxiliares y de descarga
  const getAverage = (grade: Grade) => {
    const vals = [grade.trimester1, grade.trimester2, grade.trimester3].filter(v => typeof v === 'number' && v > 0);
    if (vals.length === 0) return '-';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  const handleDownloadPDF = () => {
    if (!student) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Boletín de ${student.name}`, 14, 20);
    autoTable(doc, {
      head: [["Asignaturas", "Trimestre 1", "Trimestre 2", "Trimestre 3", "Promedio"]],
      body: subjects.map((subject) => {
        const grade = grades.find(g => g.subjectId === subject.id);
        return [subject.name, grade?.trimester1 || '-', grade?.trimester2 || '-', grade?.trimester3 || '-', grade ? getAverage(grade) : '-'];
      }),
      startY: 30,
    });
    doc.save(`Boletin_${student.name}.pdf`);
  };

  if (initialLoading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando datos...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-blue-200 via-purple-200 to-green-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 mt-8">
      <div className="bg-white bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-90 rounded-xl shadow-lg p-8 w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-900 dark:text-blue-300">Consultar Boletín</h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center items-center">
          <div className="w-full md:w-2/3">
            <FilterSelect
              options={allStudents}
              onSelect={(selected) => setStudent(selected as Student)}
              optionLabelKey="name"
              optionValueKey="id"
              placeholder="Buscar estudiante por nombre o DNI..."
              initialValue={student}
            />
          </div>
          <div className="w-full md:w-1/3">
             <select
                value={selectedCycleId}
                onChange={e => setSelectedCycleId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 h-[42px]"
                required
              >
                <option value="">Selecciona ciclo académico</option>
                {academicCycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                ))}
              </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        
        {loading && <p className="text-center">Buscando datos...</p>}

        {!loading && student && grades.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center">Boletín de {student.name}</h2>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                <thead className="bg-blue-100 dark:bg-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Materia</th>
                    <th className="py-3 px-4 text-center">Trimestre 1</th>
                    <th className="py-3 px-4 text-center">Trimestre 2</th>
                    <th className="py-3 px-4 text-center">Trimestre 3</th>
                    <th className="py-3 px-4 text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => {
                    const grade = grades.find(g => g.subjectId === subject.id);
                    return (
                      <tr key={subject.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2 px-4 font-semibold">{subject.name}</td>
                        <td className="py-2 px-4 text-center">{grade ? grade.trimester1 : '-'}</td>
                        <td className="py-2 px-4 text-center">{grade ? grade.trimester2 : '-'}</td>
                        <td className="py-2 px-4 text-center">{grade ? grade.trimester3 : '-'}</td>
                        <td className="py-2 px-4 text-center font-bold">{grade ? getAverage(grade) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjects.map(subject => {
                  const grade = grades.find(g => g.subjectId === subject.id);
                  return { subject: subject.name, ...grade };
                })} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" stroke="#8884d8" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="trimester1" fill="#60a5fa" name="Trimestre 1" />
                  <Bar dataKey="trimester2" fill="#a78bfa" name="Trimestre 2" />
                  <Bar dataKey="trimester3" fill="#34d399" name="Trimestre 3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 cursor-pointer bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                <Icon path={mdiFilePdfBox} size={1} />
                Descargar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
