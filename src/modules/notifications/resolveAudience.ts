import { admin, adminDb } from '@/lib/firebase-admin';
import { AudienceType, User } from './types';

// We'll use Firestore limits of 10 ids per "in" query.
const CHUNK_SIZE = 10;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function resolveAudience(
  audienceType: AudienceType,
  audienceId?: string,
  selectedRoles?: string[],
  selectedUsers?: string[]
): Promise<User[]> {
  const usersRef = adminDb.collection('users');

  switch (audienceType) {
    case 'ALL': {
      const snap = await usersRef.get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as User));
    }
    case 'CLASSROOM': {
      if (!audienceId) throw new Error('classroom id is required');
      const enrollSnap = await adminDb
        .collection('classroom_enrollments')
        .where('classroomId', '==', audienceId)
        .get();
      const studentIds: string[] = enrollSnap.docs.map((d) => d.data().studentId);
      if (studentIds.length === 0) return [];
      const results: User[] = [];
      const chunks = chunkArray(studentIds, CHUNK_SIZE);
      for (const chunk of chunks) {
        const q = usersRef
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .where('role', '==', 'ESTUDIANTE');
        const snap = await q.get();
        snap.docs.forEach((d) => results.push({ id: d.id, ...(d.data() as any) } as User));
      }
      return results;
    }
    case 'PARENT': {
      if (!audienceId) throw new Error('student id is required');
      const studentDoc = await usersRef.doc(audienceId).get();
      if (!studentDoc.exists) return [];
      const data = studentDoc.data() as any;
      const tutorIds: string[] = [];
      if (data.tutorId) {
        if (Array.isArray(data.tutorId)) {
          tutorIds.push(...data.tutorId);
        } else {
          tutorIds.push(data.tutorId);
        }
      }
      if (tutorIds.length === 0) return [];
      const parentResults: User[] = [];
      const chunks = chunkArray(tutorIds, CHUNK_SIZE);
      for (const chunk of chunks) {
        const q = usersRef.where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        const snap = await q.get();
        snap.docs.forEach((d) => parentResults.push({ id: d.id, ...(d.data() as any) } as User));
      }
      return parentResults;
    }
    case 'TEACHERS': {
      console.log('[resolveAudience] Fetching TEACHERS (DOCENTE, PRECEPTOR, DIRECTIVO)...');
      const snap = await usersRef
        .where('role', 'in', ['DOCENTE', 'PRECEPTOR', 'DIRECTIVO'])
        .get();
      console.log('[resolveAudience] Found', snap.docs.length, 'teachers');
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as User));
    }
    case 'ROLES': {
      if (!selectedRoles || selectedRoles.length === 0) return [];
      console.log('[resolveAudience] Fetching by roles:', selectedRoles);
      const snap = await usersRef
        .where('role', 'in', selectedRoles)
        .get();
      console.log('[resolveAudience] Found', snap.docs.length, 'users by roles');
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as User));
    }
    case 'USERS': {
      if (!selectedUsers || selectedUsers.length === 0) return [];
      console.log('[resolveAudience] Fetching selected users:', selectedUsers);
      const results: User[] = [];
      const chunks = chunkArray(selectedUsers, CHUNK_SIZE);
      for (const chunk of chunks) {
        const q = usersRef.where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        const snap = await q.get();
        snap.docs.forEach((d) => results.push({ id: d.id, ...(d.data() as any) } as User));
      }
      console.log('[resolveAudience] Found', results.length, 'selected users');
      return results;
    }
    default:
      return [];
  }
}
