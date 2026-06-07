export interface GradeEntry {
  id?: string;
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  trimester?: number; // 1,2,3
  grade?: number | null;
  teacherId?: string;
  createdAt?: any;
}

export interface ExamRecord {
  id?: string;
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  examDate: string; // ISO
  grade: number;
  note?: string;
  teacherId?: string;
  createdAt?: any;
}

export interface SubjectAnalytics {
  subjectId: string;
  subjectName: string;
  trimesterGrades: Record<number, number | null>; // 1,2,3
  trimesterGradeEntries?: Record<number, GradeEntry | null>;
  average?: number | null;
  passed?: boolean;
  exams?: ExamRecord[];
}

export interface CycleAnalytics {
  academicCycleId: string;
  academicCycleName?: string;
  studyYear?: string; // e.g. "1°" or classroom name
  subjects: SubjectAnalytics[];
}
