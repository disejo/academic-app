import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { chunkArray } from './utils';
import type { CycleAnalytics, SubjectAnalytics, GradeEntry, ExamRecord } from './types';
import { updateDoc, doc as docRef } from 'firebase/firestore';

export async function fetchAcademicCyclesForStudent(studentId: string) {
  const enrollRef = collection(db, 'classroom_enrollments');
  const q = query(enrollRef, where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const cycleIds = Array.from(new Set(snap.docs.map((d) => d.data().academicCycleId).filter(Boolean)));

  if (cycleIds.length === 0) return [];

  const cycles: { id: string; name?: string }[] = [];
  const chunks = chunkArray(cycleIds, 10);
  for (const ch of chunks) {
    const cyclesSnap = await getDocs(query(collection(db, 'academicCycles'), where('__name__', 'in', ch)));
    cyclesSnap.forEach((doc) => cycles.push({ id: doc.id, name: doc.data().name }));
  }
  return cycles;
}

export async function fetchCycleAnalytics(studentId: string, academicCycleId: string): Promise<CycleAnalytics> {
  // determine classroom enrollment for the student in this cycle to infer study year
  let studyYear: string | undefined = undefined;
  try {
    const enrollRef = collection(db, 'classroom_enrollments');
    const enrollSnap = await getDocs(query(enrollRef, where('studentId', '==', studentId), where('academicCycleId', '==', academicCycleId)));
    if (enrollSnap.docs.length > 0) {
      const enrollDoc = enrollSnap.docs[0].data() as any;
      const classroomId = enrollDoc.classroomId;
      if (classroomId) {
        const classSnap = await getDocs(query(collection(db, 'classrooms'), where('__name__', '==', classroomId)));
        if (classSnap.docs.length > 0) {
          const c = classSnap.docs[0].data() as any;
          const name = c.name || '';
          // extract first number as study year if present
          const m = name.match(/(\d+)/);
          if (m) studyYear = `${m[1]}°`;
          else studyYear = name;
        }
      }
    }
  } catch (err) {
    // ignore, best-effort
    console.warn('fetchCycleAnalytics: could not determine studyYear', err);
  }
  // Fetch grades for student in the cycle
  const gradesRef = collection(db, 'grades');
  const gradesSnap = await getDocs(
    query(gradesRef, where('studentId', '==', studentId), where('academicCycleId', '==', academicCycleId))
  );

  const grades = gradesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as GradeEntry[];

  const subjectIds = Array.from(new Set(grades.map((g) => g.subjectId).filter(Boolean)));

  const subjectsMap = new Map<string, string>();
  if (subjectIds.length > 0) {
    const chunks = chunkArray(subjectIds, 10);
    for (const ch of chunks) {
      const subsSnap = await getDocs(query(collection(db, 'subjects'), where('__name__', 'in', ch)));
      subsSnap.forEach((doc) => subjectsMap.set(doc.id, doc.data().name || ''));
    }
  }

  const subjectsAnalytics: SubjectAnalytics[] = subjectIds.map((sid) => {
    const related = grades.filter((g) => g.subjectId === sid);
    const trimesterGrades: Record<number, number | null> = { 1: null, 2: null, 3: null };
    related.forEach((g) => {
      if (g.trimester && [1, 2, 3].includes(g.trimester)) trimesterGrades[g.trimester] = g.grade ?? null;
    });

    const presentGrades = Object.values(trimesterGrades).filter((v) => v !== null) as number[];
    const average = presentGrades.length > 0 ? presentGrades.reduce((a, b) => a + b, 0) / presentGrades.length : null;
    const passed = average !== null ? average >= 7 : false;

    return {
      subjectId: sid,
      subjectName: subjectsMap.get(sid) || '',
      trimesterGrades,
      average,
      passed,
      exams: [],
    } as SubjectAnalytics;
  });

  // Fetch exam records stored in 'exam_grades'
  const examsRef = collection(db, 'exam_grades');
  const examsSnap = await getDocs(query(examsRef, where('studentId', '==', studentId), where('academicCycleId', '==', academicCycleId)));
  const exams = examsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ExamRecord[];

  // Attach exams to subjects
  for (const sub of subjectsAnalytics) {
    sub.exams = exams.filter((e) => e.subjectId === sub.subjectId).sort((a, b) => (a.examDate > b.examDate ? -1 : 1));
  }

  return {
    academicCycleId,
    academicCycleName: undefined,
    studyYear,
    subjects: subjectsAnalytics,
  } as CycleAnalytics;
}

export async function saveExamRecord(record: Omit<ExamRecord, 'id' | 'createdAt'>) {
  const ref = collection(db, 'exam_grades');
  const now = new Date().toISOString();
  const payload = { ...record, createdAt: now };
  const res = await addDoc(ref, payload as any);
  return { id: res.id, ...payload } as ExamRecord;
}

export async function updateExamRecord(record: ExamRecord) {
  if (!record.id) throw new Error('Exam id required to update');
  const ref = docRef(db, 'exam_grades', record.id);
  await updateDoc(ref, { grade: record.grade, examDate: record.examDate, note: record.note ?? '' });
  return record;
}

export async function saveTrimesterGrade(payload: {
  studentId: string;
  subjectId: string;
  academicCycleId: string;
  trimester: number;
  grade: number | null;
}) {
  // search for existing grade doc
  const gradesRef = collection(db, 'grades');
  const qWhere = query(
    gradesRef,
    where('studentId', '==', payload.studentId),
    where('subjectId', '==', payload.subjectId),
    where('academicCycleId', '==', payload.academicCycleId),
    where('trimester', '==', payload.trimester)
  );
  const snap = await getDocs(qWhere);
  if (snap.docs.length > 0) {
    const doc = snap.docs[0];
    const ref = docRef(db, 'grades', doc.id);
    await updateDoc(ref, { grade: payload.grade });
    return { id: doc.id, ...(doc.data() as any), grade: payload.grade } as GradeEntry;
  }

  const res = await addDoc(gradesRef, {
    studentId: payload.studentId,
    subjectId: payload.subjectId,
    academicCycleId: payload.academicCycleId,
    trimester: payload.trimester,
    grade: payload.grade,
    createdAt: new Date().toISOString(),
  } as any);

  return { id: res.id, ...payload } as GradeEntry;
}
