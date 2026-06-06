/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from 'react';
import type { CycleAnalytics, SubjectAnalytics, ExamRecord } from './types';
import { fetchAcademicCyclesForStudent, fetchCycleAnalytics, saveExamRecord, saveTrimesterGrade, updateExamRecord } from './analyticsService';
import EditExamModal from './EditExamModal';
import EditGradeModal from './EditGradeModal';
// @ts-ignore
import { saveAs } from 'file-saver';
// @ts-ignore
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  studentId: string;
}

export default function StudentAnalytics({ studentId }: Props) {
  const [cycles, setCycles] = useState<{ id: string; name?: string }[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState<boolean>(true);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CycleAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubject, setModalSubject] = useState<{ subjectId: string; subjectName?: string } | null>(null);
  const [modalExistingExam, setModalExistingExam] = useState<ExamRecord | null>(null);
  const [uniqueExamDates, setUniqueExamDates] = useState<string[]>([]);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [gradeModalInfo, setGradeModalInfo] = useState<{ subjectId: string; subjectName?: string; trimester?: number; initial?: number | null } | null>(null);

  useEffect(() => {
    const loadCycles = async () => {
      setCyclesLoading(true);
      try {
        const res = await fetchAcademicCyclesForStudent(studentId);
        setCycles(res || []);
        if (res && res.length > 0) setActiveCycleId((prev) => prev ?? res[0].id);
      } finally {
        setCyclesLoading(false);
      }
    };
    loadCycles();
  }, [studentId]);

  useEffect(() => {
    if (!activeCycleId) return setAnalytics(null);
    const load = async () => {
      setAnalyticsLoading(true);
      try {
        const data = await fetchCycleAnalytics(studentId, activeCycleId);
        setAnalytics(data);
        // build unique exam dates
        const dates = new Set<string>();
        data.subjects.forEach((s: SubjectAnalytics) => s.exams?.forEach((e: ExamRecord) => { if (e.examDate) dates.add(new Date(e.examDate).toISOString()); }));
        const sorted = Array.from(dates).sort((a,b) => (a < b ? 1 : -1));
        setUniqueExamDates(sorted);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    load();
  }, [activeCycleId, studentId]);

  const openAddExam = (subject: SubjectAnalytics) => {
    setModalSubject({ subjectId: subject.subjectId, subjectName: subject.subjectName });
    setModalExistingExam(null);
    setModalOpen(true);
  };

  const openEditExam = (subject: SubjectAnalytics, exam: ExamRecord) => {
    setModalSubject({ subjectId: subject.subjectId, subjectName: subject.subjectName });
    setModalExistingExam(exam);
    setModalOpen(true);
  };

  const openEditGrade = (subject: SubjectAnalytics, trimester: number) => {
    setGradeModalInfo({ subjectId: subject.subjectId, subjectName: subject.subjectName, trimester, initial: subject.trimesterGrades[trimester] ?? null });
    setGradeModalOpen(true);
  };

  const handleSavedExam = (rec: ExamRecord) => {
    // refresh
    if (activeCycleId) fetchCycleAnalytics(studentId, activeCycleId).then((d) => setAnalytics(d));
  };

  const exportCSV = () => {
    if (!analytics) return;
    const header = ['Materia','T1','T2','T3','Promedio','Estado','Exámenes'];
    const rows = analytics.subjects.map(s => [
      s.subjectName,
      s.trimesterGrades[1] ?? '',
      s.trimesterGrades[2] ?? '',
      s.trimesterGrades[3] ?? '',
      s.average !== null && s.average !== undefined ? s.average.toFixed(2) : '',
      s.passed ? 'Aprobada' : 'Desaprobada',
      s.exams && s.exams.length ? s.exams.map(e => `${new Date(e.examDate).toLocaleDateString()}:${e.grade}`).join(' | ') : ''
    ]);

    const csvContent = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analitico_${studentId}_${analytics.academicCycleId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!analytics) return;
    const doc = new jsPDF();
    doc.text(`Analítico - Ciclo ${analytics.academicCycleId}`, 14, 20);
    const tableBody = analytics.subjects.map(s => [
      s.subjectName,
      s.trimesterGrades[1] ?? '-',
      s.trimesterGrades[2] ?? '-',
      s.trimesterGrades[3] ?? '-',
      s.average !== null && s.average !== undefined ? s.average.toFixed(2) : '-',
      s.passed ? 'Aprobada' : 'Desaprobada',
    ]);
    // @ts-ignore
    autoTable(doc, { startY: 30, head: [['Materia','T1','T2','T3','Promedio','Estado']], body: tableBody });
    doc.save(`analitico_${studentId}_${analytics.academicCycleId}.pdf`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-md shadow">
      <h3 className="text-xl font-semibold mb-3">Analítico del estudiante</h3>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="block text-sm">Ciclo</label>
          <div className="relative">
            <select
              className="p-2 pr-8 mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded"
              value={activeCycleId ?? ''}
              onChange={(e) => setActiveCycleId(e.target.value || null)}
            >
              <option value="">Seleccionar ciclo</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            {cyclesLoading && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>
            )}
          </div>
          {analytics?.studyYear && <div className="text-sm text-gray-600 dark:text-gray-300">Curso: <strong className="ml-1">{analytics.studyYear}</strong></div>}
        </div>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm" onClick={() => exportCSV()}>
            Exportar CSV
          </button>
          <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm" onClick={() => exportPDF()}>
            Exportar PDF
          </button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-gray-600 dark:text-gray-300 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-300">Cargando analítico...</span>
        </div>
      ) : !analytics ? (
        <p className="text-sm text-gray-500">Selecciona un ciclo para ver el analítico.</p>
      ) : (
        <div>
          <table className="min-w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                <th className="p-2 border">Materia</th>
                <th className="p-2 border">T1</th>
                <th className="p-2 border">T2</th>
                <th className="p-2 border">T3</th>
                <th className="p-2 border">Promedio</th>
                <th className="p-2 border">Estado</th>
                <th className="p-2 border">Exámenes</th>
                {uniqueExamDates.map((d) => (
                  <th key={d} className="p-2 border">{new Date(d).toLocaleDateString()}</th>
                ))}
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {analytics.subjects.map((s) => (
                <tr key={s.subjectId} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800">
                  <td className="p-2 border">{s.subjectName}</td>
                  <td className="p-2 border">
                    <div className="flex items-center gap-2">
                      <span>{s.trimesterGrades[1] ?? '-'}</span>
                      <button className="text-xs text-blue-600 dark:text-blue-400" onClick={() => openEditGrade(s, 1)}>Editar</button>
                    </div>
                  </td>
                  <td className="p-2 border">
                    <div className="flex items-center gap-2">
                      <span>{s.trimesterGrades[2] ?? '-'}</span>
                      <button className="text-xs text-blue-600 dark:text-blue-400" onClick={() => openEditGrade(s, 2)}>Editar</button>
                    </div>
                  </td>
                  <td className="p-2 border">
                    <div className="flex items-center gap-2">
                      <span>{s.trimesterGrades[3] ?? '-'}</span>
                      <button className="text-xs text-blue-600 dark:text-blue-400" onClick={() => openEditGrade(s, 3)}>Editar</button>
                    </div>
                  </td>
                  <td className="p-2 border">{s.average !== null && s.average !== undefined ? s.average.toFixed(2) : '-'}</td>
                  <td className="p-2 border">{s.passed ? <span className="text-emerald-600 dark:text-emerald-400">Aprobada</span> : <span className="text-red-600 dark:text-red-400">Desaprobada</span>}</td>
                  <td className="p-2 border">
                    {s.exams && s.exams.length > 0 ? (
                      <ul className="space-y-1">
                        {s.exams.map((e) => (
                          <li key={e.id} className="text-sm">{new Date(e.examDate).toLocaleDateString()} — <button className="text-blue-600 dark:text-blue-400" onClick={() => openEditExam(s, e)}>{e.grade}</button></li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  {uniqueExamDates.map((d) => {
                    const found = s.exams?.find((ex) => ex.examDate && new Date(ex.examDate).toISOString().slice(0,10) === new Date(d).toISOString().slice(0,10));
                    return (
                      <td key={d} className="p-2 border">
                        {found ? (
                          <div className="flex items-center gap-2">
                            <span>{found.grade}</span>
                            <button className="text-xs text-blue-600 dark:text-blue-400" onClick={() => openEditExam(s, found)}>Editar</button>
                          </div>
                        ) : (
                          <button className="text-xs text-blue-600 dark:text-blue-400" onClick={() => { setModalSubject({ subjectId: s.subjectId, subjectName: s.subjectName }); setModalExistingExam(null); setModalOpen(true); }}>
                            Agregar nota
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 border">
                    <button className="px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-sm hover:opacity-95" onClick={() => openAddExam(s)}>Agregar examen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalSubject && (
        <EditExamModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setModalExistingExam(null); }}
          studentId={studentId}
          subjectId={modalSubject.subjectId}
          academicCycleId={activeCycleId ?? ''}
          existing={modalExistingExam ?? undefined}
          onSave={async (payload) => {
            if (modalExistingExam && modalExistingExam.id) {
              // update existing
              const updated = { ...modalExistingExam, ...payload } as any;
              await updateExamRecord(updated);
              handleSavedExam(updated as ExamRecord);
              return updated as ExamRecord;
            }
            const res = await saveExamRecord(payload);
            handleSavedExam(res);
            return res;
          }}
          onSaved={handleSavedExam}
        />
      )}

      {gradeModalInfo && (
        <EditGradeModal
          open={gradeModalOpen}
          onClose={() => setGradeModalOpen(false)}
          studentId={studentId}
          subjectId={gradeModalInfo.subjectId}
          academicCycleId={activeCycleId ?? ''}
          trimester={gradeModalInfo.trimester}
          initialGrade={gradeModalInfo.initial}
          onSave={saveTrimesterGrade}
          onSaved={() => { if (activeCycleId) fetchCycleAnalytics(studentId, activeCycleId).then((d) => setAnalytics(d)); }}
        />
      )}
    </div>
  );
}
