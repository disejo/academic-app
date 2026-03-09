import { admin, adminDb } from '@/lib/firebase-admin';
import { NotificationData } from './types';

/**
 * Persists a notification document in Firestore.
 * Returns a DocumentReference that can be used to write logs later.
 */
export async function createNotification(
  data: NotificationData
): Promise<import('firebase-admin').firestore.DocumentReference> {
  // Filter out undefined values to avoid Firestore errors
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  const docRef = await adminDb.collection('notifications').add({
    ...filteredData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef;
}
