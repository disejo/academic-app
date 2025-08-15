import { NextRequest, NextResponse } from 'next/server';
import { admin, adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  console.log("CREATE-USER API: Received request.");
  try {
    const { email, password, name, dni, phone, role, tutorId } = await req.json();

    if (!email || !password || !name || !dni || !phone || !role) {
      console.log("CREATE-USER API: Missing required fields.");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`CREATE-USER API: Creating user ${email} in Firebase Auth...`);
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    console.log(`CREATE-USER API: Auth user created successfully with UID: ${userRecord.uid}`);

    console.log(`CREATE-USER API: Setting custom claims for UID: ${userRecord.uid}`);
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });
    console.log("CREATE-USER API: Custom claims set successfully.");

    const userData = {
      name,
      email,
      dni: String(dni), // Ensure DNI is stored as a string
      phone,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log(`CREATE-USER API: Attempting to write to Firestore for UID: ${userRecord.uid}`);
    console.log("CREATE-USER API: User data to be written:", userData);
    
    await adminDb.collection('users').doc(userRecord.uid).set(userData);
    
    console.log("CREATE-USER API: Firestore write completed successfully.");

    if (role === 'ESTUDIANTE' && tutorId) {
      console.log(`CREATE-USER API: Associating student ${userRecord.uid} with tutor ${tutorId}`);
      const tutorRef = adminDb.collection('users').doc(tutorId);
      await tutorRef.update({
        children: admin.firestore.FieldValue.arrayUnion(userRecord.uid)
      });
      console.log("CREATE-USER API: Tutor association updated.");
    }

    console.log("CREATE-USER API: Request processed successfully.");
    return NextResponse.json({ message: 'User created successfully', uid: userRecord.uid });
  } catch (error: any) {
    console.error('--- CREATE-USER API: FATAL ERROR ---');
    console.error("Error object:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error('--- END OF FATAL ERROR ---');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}