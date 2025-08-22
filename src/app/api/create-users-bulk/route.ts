/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { admin, adminAuth, adminDb } from '@/lib/firebase-admin';

interface UserData {
  Name: string;
  DNI: string | number;
  Email: string;
  Password: string;
  Role: string;
}

export async function POST(req: NextRequest) {
  console.log("BULK-CREATE API: Received request.");
  try {
    const users = await req.json();

    if (!Array.isArray(users) || users.length === 0) {
      console.log("BULK-CREATE API: Invalid request body.");
      return NextResponse.json({ error: 'Invalid request body. Expected an array of users.' }, { status: 400 });
    }

    console.log(`BULK-CREATE API: Processing ${users.length} users.`);
    let successCount = 0;
    let errorCount = 0;
    const errors: { user: UserData, error: string }[] = [];

    for (const user of users) {
      const { Name, DNI, Email, Password, Role } = user;

      if (!Email || !Password || !Name || !Role || !DNI) {
        console.log(`BULK-CREATE API: Skipping user due to missing fields:`, user);
        errorCount++;
        errors.push({ user, error: 'Missing required fields.' });
        continue;
      }

      try {
        console.log(`BULK-CREATE API: Creating Auth user for ${Email}...`);
        const userRecord = await adminAuth.createUser({
          email: Email,
          password: Password,
          displayName: Name,
        });
        console.log(`BULK-CREATE API: Auth user created for ${Email} with UID: ${userRecord.uid}`);

        await adminAuth.setCustomUserClaims(userRecord.uid, { role: Role.toUpperCase() });

        const userData = {
          name: Name,
          email: Email,
          dni: String(DNI), // Ensure DNI is stored as a string
          role: Role.toUpperCase(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        console.log(`BULK-CREATE API: Attempting to write to Firestore for ${Email} (UID: ${userRecord.uid})`);
        await adminDb.collection('users').doc(userRecord.uid).set(userData);
        console.log(`BULK-CREATE API: Firestore write successful for ${Email}.`);

        successCount++;
      } catch (error: any) {
        console.error(`--- BULK-CREATE API: ERROR processing user ${Email} ---`);
        console.error("Error object:", error);
        console.error("Error message:", error.message);
        console.error('--- END OF ERROR ---');
        errorCount++;
        errors.push({ user, error: error.message });
      }
    }

    console.log(`BULK-CREATE API: Process completed. Success: ${successCount}, Failed: ${errorCount}`);
    return NextResponse.json({
      message: 'Bulk user creation process completed.',
      successCount,
      errorCount,
      errors,
    });

  } catch (error: any) {
    console.error('--- BULK-CREATE API: FATAL ERROR ---');
    console.error("Error object:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error('--- END OF FATAL ERROR ---');
    return NextResponse.json({ error: 'An unexpected error occurred on the server.' }, { status: 500 });
  }
}