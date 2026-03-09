/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/modules/notifications/notificationService';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  console.log('[API] /notifications/send POST called');
  try {
    console.log('[API] Parsing request body...');
    const payload = (await req.json()) as any;
    console.log('[API] Payload received:', payload);

    const {
      title,
      message,
      audienceType,
      selectedRoles,
      selectedUsers,
      sendEmail,
      sendWhatsapp,
      createdBy,
    } = payload;

    // Verificar permisos del usuario
    console.log('[API] Verifying user permissions for:', createdBy);
    const userDoc = await adminDb.collection('users').doc(createdBy).get();
    if (!userDoc.exists) {
      console.log('[API] User not found');
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });
    }
    const userData = userDoc.data();
    if (!userData || !['DIRECTIVO', 'PRECEPTOR'].includes(userData.role)) {
      console.log('[API] User not authorized, role:', userData?.role);
      return NextResponse.json({ error: 'No autorizado para enviar notificaciones' }, { status: 403 });
    }
    console.log('[API] User authorized, role:', userData.role);

    if (
      !title ||
      !message ||
      !audienceType ||
      typeof sendEmail !== 'boolean' ||
      typeof sendWhatsapp !== 'boolean' ||
      !createdBy ||
      (audienceType === 'ROLES' && (!Array.isArray(selectedRoles) || selectedRoles.length === 0)) ||
      (audienceType === 'USERS' && (!Array.isArray(selectedUsers) || selectedUsers.length === 0))
    ) {
      console.log('[API] /notifications/send missing fields', payload);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!sendEmail && !sendWhatsapp) {
      return NextResponse.json({ error: 'Debe escoger al menos un canal (email o whatsapp)' }, { status: 400 });
    }

    console.log('[API] Calling sendNotification...');
    const result = await sendNotification({
      title,
      message,
      audienceType,
      audienceId: undefined, // not used
      selectedRoles,
      selectedUsers,
      sendEmail,
      sendWhatsapp,
      createdBy,
    });
    console.log('[API] sendNotification result:', result);

    return NextResponse.json({ message: 'Notification queued', ...result });
  } catch (error: any) {
    console.error('[API] /notifications/send error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
