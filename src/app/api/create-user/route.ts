import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // Assuming you have this file

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone, role, tutorId } = await req.json();

    if (!email || !password || !name || !phone || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims for the user's role
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // Store additional user information in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email,
      phone,
      role,
      createdAt: adminDb.FieldValue.serverTimestamp(),
    });

    // If the created user is a student, associate them with a tutor
    if (role === 'ESTUDIANTE' && tutorId) {
      const tutorRef = adminDb.collection('users').doc(tutorId);
      await tutorRef.update({
        children: adminDb.FieldValue.arrayUnion(userRecord.uid)
      });
    }

    return NextResponse.json({ message: 'User created successfully', uid: userRecord.uid });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
