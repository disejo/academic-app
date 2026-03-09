import { createNotification } from './createNotification';
import { resolveAudience } from './resolveAudience';
import { sendEmail } from './sendEmail';
import { sendWhatsapp } from './sendWhatsapp';
import { NotificationData } from './types';
import { admin, adminDb } from '@/lib/firebase-admin';

/**
 * master function for creating a notification, resolving recipients and
 * attempting delivery.  Each send is tracked in the `notification_logs`
 * collection so the caller can inspect success/failure later.
 */
export async function sendNotification(data: NotificationData) {
  const docRef = await createNotification(data);
  const recipients = await resolveAudience(data.audienceType, data.audienceId, data.selectedRoles, data.selectedUsers);

  // iterate sequentially so we can log errors per user.
  for (const user of recipients) {
    let emailSent = false;
    let whatsappSent = false;
    let status: 'sent' | 'failed' = 'sent';

    try {
      if (data.sendEmail && user.email) {
        await sendEmail(user.email, data.title, data.message);
        emailSent = true;
      }
      if (data.sendWhatsapp && user.phone) {
        await sendWhatsapp(user.phone, data.message);
        whatsappSent = true;
      }
    } catch (err) {
      console.error('Error delivering notification to', user.id, err);
      status = 'failed';
    }

    try {
      await adminDb.collection('notification_logs').add({
        notificationId: docRef.id,
        userId: user.id,
        emailSent,
        whatsappSent,
        status,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to write log for', user.id, err);
    }
  }

  return {
    notificationId: docRef.id,
    recipientCount: recipients.length,
  };
}
