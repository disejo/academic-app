"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import Icon from '@mdi/react';
import { mdiFilePdfBox } from '@mdi/js';

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

interface ClassroomEnrollment {
  id: string;
  studentId: string;
  classroomId: string;
  academicCycleId: string;
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
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Obtener ciclos académicos al cargar la página
    const fetchCycles = async () => {
      try {
        const q = query(collection(db, "academicCycles"));
        const snapshot = await getDocs(q);
        const cycles: AcademicCycle[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setAcademicCycles(cycles);
      } catch {
        setAcademicCycles([]);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCycles();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStudent(null);
    setGrades([]);
    setSubjects([]);
    try {
      // Buscar estudiante por DNI o nombre
      const q = query(
        collection(db, "users"),
        where("role", "==", "ESTUDIANTE"),
        where("dni", "==", search)
      );
      let querySnapshot = await getDocs(q);
      let foundStudent: Student | null = null;
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        foundStudent = {
          id: doc.id,
          name: doc.data().name,
          dni: doc.data().dni,
        };
      } else {
        // Si no encuentra por DNI, busca por nombre
        const q2 = query(
         // ...existing code...
          collection(db, "users"),
          where("role", "==", "ESTUDIANTE"),
          where("name", "==", search)
        );
        querySnapshot = await getDocs(q2);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          foundStudent = {
            id: doc.id,
            name: doc.data().name,
            dni: doc.data().dni,
          };
        }
      }
      if (!foundStudent) {
              setInitialLoading(false);
        setError("Estudiante no encontrado");
        setLoading(false);
        return;
      }
      setStudent(foundStudent);
      // Buscar la clase del estudiante en el ciclo académico seleccionado
      if (!selectedCycleId) {
        setError("Selecciona un ciclo académico");
        setLoading(false);
        return;
      }
      const enrollQ = query(
        collection(db, "classroom_enrollments"),
        where("studentId", "==", foundStudent.id),
        where("academicCycleId", "==", selectedCycleId)
      );
      const enrollSnap = await getDocs(enrollQ);
      if (enrollSnap.empty) {
        setError("No se encontró clase para el estudiante en el ciclo seleccionado");
        setLoading(false);
        return;
      }
      const classroomId = enrollSnap.docs[0].data().classroomId;
      // Obtener los subjectId de la clase
      const classroomSubjectsQ = query(
        collection(db, "classroom_subjects"),
        where("classroomId", "==", classroomId)
      );
      const classroomSubjectsSnap = await getDocs(classroomSubjectsQ);
      const subjectIds = classroomSubjectsSnap.docs.map(doc => doc.data().subjectId);
      if (subjectIds.length === 0) {
        setSubjects([]);
        setGrades([]);
        setLoading(false);
        return;
      }
      // Obtener los datos de las asignaturas
      const subjectsData: Subject[] = [];
      for (const subjectId of subjectIds) {
        const subjectDoc = await getDocs(query(collection(db, "subjects"), where("name", ">", "")));
        const subjectSnap = subjectDoc.docs.find(doc => doc.id === subjectId);
        if (subjectSnap) {
          subjectsData.push({ id: subjectSnap.id, name: subjectSnap.data().name });
        }
      }
      setSubjects(subjectsData);
      // Buscar notas del estudiante solo para esas asignaturas
      const gradesQ = query(
        collection(db, "grades"),
        where("studentId", "==", foundStudent.id),
        where("academicCycleId", "==", selectedCycleId)
      );
      const gradesSnapshot = await getDocs(gradesQ);
      // Agrupar por subjectId y trimestre
      const gradesMap: Record<string, { subjectId: string; trimester1?: number; trimester2?: number; trimester3?: number }> = {};
      gradesSnapshot.forEach(doc => {
        const data = doc.data();
        const subjectId = data.subjectId;
        if (!subjectIds.includes(subjectId)) return;
        const trimester = data.trimester;
        const grade = data.grade;
        if (!gradesMap[subjectId]) {
          gradesMap[subjectId] = { subjectId };
        }
        if (trimester === 1) gradesMap[subjectId].trimester1 = grade;
        if (trimester === 2) gradesMap[subjectId].trimester2 = grade;
        if (trimester === 3) gradesMap[subjectId].trimester3 = grade;
      });
      setGrades(
        Object.values(gradesMap).map(g => ({
          subjectId: g.subjectId,
          trimester1: typeof g.trimester1 === "number" ? g.trimester1 : 0,
          trimester2: typeof g.trimester2 === "number" ? g.trimester2 : 0,
          trimester3: typeof g.trimester3 === "number" ? g.trimester3 : 0,
        }))
      );
    } catch {
      setError("Error al buscar estudiante o notas");
    } finally {
      setLoading(false);
    }
  };

  function getAverage(grade: Grade) {
    const vals = [grade.trimester1, grade.trimester2, grade.trimester3]
      .filter(v => typeof v === 'number' && v > 0); // Ignora 0 = sin nota
    if (vals.length === 0) return '-';
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    return avg.toFixed(2);
  }

   const handleDownloadPDF = () => {
     if (!student) return;
     const doc = new jsPDF();
     doc.setFontSize(16);
     doc.text(`Boletín de ${student.name}`, 14, 20);
     const tableData = subjects.map((subject) => {
       const grade = grades.find(g => g.subjectId === subject.id);
       return [
         subject.name,
         grade ? grade.trimester1 : '-',
         grade ? grade.trimester2 : '-',
         grade ? grade.trimester3 : '-',
         grade ? getAverage(grade) : '-',
       ];
     });
     autoTable(doc, {
       head: [["Asignaturas", "Trimestre 1", "Trimestre 2", "Trimestre 3", "Promedio"]],
       body: tableData,
       startY: 30,
     });
     doc.save(`Boletin_${student.name}.pdf`);
   };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-800 text-gray-100">
        Cargando datos del tablero...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-blue-200 via-purple-200 to-green-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 mt-8">
      <div className="bg-white bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-90 rounded-xl shadow-lg p-8 w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-900 dark:text-blue-300">Buscar Estudiante</h1>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center">
          <input
            type="text"
            placeholder="Buscar por DNI o Nombre"
            className="shadow appearance-none border rounded py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 w-full md:w-2/3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            required
          />
          <select
            value={selectedCycleId}
            onChange={e => setSelectedCycleId(e.target.value)}
            className="shadow appearance-none border rounded py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 w-full md:w-1/3"
            required
          >
            <option value="">Selecciona ciclo académico</option>
            {academicCycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-400 text-white font-bold py-2 px-6 rounded-xl focus:outline-none focus:shadow-outline transition-all duration-200 shadow-md"
            disabled={loading}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
        {error && <p className="text-red-500 text-xs italic mb-4 text-center">{error}</p>}
        {student && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-center">Boletín de {student.name}</h2>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-100 dark:bg-gray-700">
                    <th className="py-2 px-4 text-left">Materia</th>
                    <th className="py-2 px-4 text-center">Trimestre 1</th>
                    <th className="py-2 px-4 text-center">Trimestre 2</th>
                    <th className="py-2 px-4 text-center">Trimestre 3</th>
                    <th className="py-2 px-4 text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => {
                    const grade = grades.find(g => g.subjectId === subject.id);
                    return (
                      <tr key={subject.id} className="border-b dark:border-gray-700">
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
                  return {
                    subject: subject.name,
                    trimester1: grade ? grade.trimester1 : 0,
                    trimester2: grade ? grade.trimester2 : 0,
                    trimester3: grade ? grade.trimester3 : 0,
                  };
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
                className="cursor-pointer bg-red-600 hover:bg-red-500">
                <Icon path={mdiFilePdfBox} size={1} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}