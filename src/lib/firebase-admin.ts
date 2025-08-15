import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL, // Add this line
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error.stack);
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb };
