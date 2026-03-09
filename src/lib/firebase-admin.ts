import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    console.log('Initializing Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL, // Add this line
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error("Firebase admin initialization error", error.stack);
    console.error('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'set' : 'NOT SET');
    console.error('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'NOT SET');
    console.error('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'set' : 'NOT SET');
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb };
