import * as admin from 'firebase-admin';

function sanitizePrivateKey(raw?: string) {
  if (!raw) return undefined;
  let key = raw.replace(/\\n/g, '\n').trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    try {
      key = JSON.parse(key);
    } catch {
      // Keep original value if JSON parse fails.
    }
  }
  return key;
}

const firebasePrivateKey = sanitizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !firebasePrivateKey) {
      throw new Error('Missing Firebase admin credentials: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required.');
    }

    console.log('Initializing Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: firebasePrivateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Firebase admin initialization error', error.stack);
    } else {
      console.error('Firebase admin initialization error', error);
    }
    console.error('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'set' : 'NOT SET');
    console.error('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'NOT SET');
    console.error('FIREBASE_PRIVATE_KEY:', firebasePrivateKey ? 'set' : 'NOT SET');
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb };
