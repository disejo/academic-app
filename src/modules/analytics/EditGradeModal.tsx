"use client";
import { useState } from 'react';
import type { GradeEntry } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  trimester?: number;
  initialGrade?: number | null;
  onSave: (payload: { studentId: string; subjectId: string; academicCycleId: string; trimester: number; grade: number | null }) => Promise<GradeEntry>;
  onSaved?: (g: GradeEntry) => void;
}

export default function EditGradeModal({ open, onClose, studentId, subjectId, academicCycleId, trimester = 1, initialGrade = null, onSave, onSaved }: Props) {
  const [grade, setGrade] = useState<number | ''>(initialGrade ?? '');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handle = async () => {
    setSaving(true);
    try {
      const payload = { studentId, subjectId, academicCycleId, trimester, grade: grade === '' ? null : Number(grade) };
      const res = await onSave(payload);
      onSaved?.(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error guardando nota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-md p-4 w-80">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Editar Nota - Trimestre {trimester}</h3>
        <label className="block text-sm text-gray-700 dark:text-gray-300">Nota</label>
        <input type="number" min={0} max={10} className="w-full p-2 mb-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white" value={grade as any} onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="px-3 py-1 rounded bg-blue-600 dark:bg-blue-500 text-white" onClick={handle} disabled={saving}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
