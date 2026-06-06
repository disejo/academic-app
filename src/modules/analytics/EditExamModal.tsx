"use client";
import { useState, useEffect } from 'react';
import type { ExamRecord } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  existing?: ExamRecord | null;
  onSaved?: (rec: ExamRecord) => void;
  onSave: (payload: Omit<ExamRecord, 'id' | 'createdAt'>) => Promise<ExamRecord>;
}

export default function EditExamModal({ open, onClose, studentId, subjectId, academicCycleId, existing, onSaved, onSave }: Props) {
  const [grade, setGrade] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setGrade(existing.grade ?? '');
      setDate(existing.examDate ? new Date(existing.examDate).toISOString().slice(0, 10) : '');
    } else {
      setGrade('');
      setDate('');
    }
  }, [existing, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (grade === '' || !date) return alert('Completa fecha y nota');
    setSaving(true);
    try {
      const payload = {
        studentId,
        subjectId,
        academicCycleId,
        examDate: new Date(date).toISOString(),
        grade: Number(grade),
        note: '',
      };
      const res = await onSave(payload);
      onSaved?.(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error guardando nota de examen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-md p-4 w-96">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{existing ? 'Editar Nota de Examen' : 'Agregar Nota de Examen'}</h3>
        <label className="block text-sm text-gray-700 dark:text-gray-300">Fecha</label>
        <input type="date" className="w-full p-2 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white" value={date} onChange={(e) => setDate(e.target.value)} />
        <label className="block text-sm text-gray-700 dark:text-gray-300">Nota</label>
        <input
          type="number"
          min={0}
          max={10}
          className="w-full p-2 mb-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white"
          value={grade as any}
          onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="px-3 py-1 rounded bg-blue-600 dark:bg-blue-500 text-white" onClick={handleSave} disabled={saving}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
