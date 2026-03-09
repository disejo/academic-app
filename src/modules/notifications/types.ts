import { Timestamp } from 'firebase-admin/firestore';

export type Role =
  | 'ADMIN'
  | 'DIRECTIVO'
  | 'PRECEPTOR'
  | 'ESTUDIANTE'
  | 'DOCENTE'
  | 'TUTOR';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  tutorId?: string | string[];
  children?: string[];
}

export type AudienceType =
  | 'ALL'
  | 'CLASSROOM'
  | 'PARENT'
  | 'TEACHERS'
  | 'USERS'
  | 'ROLES'
  | 'SELECTED_USERS';

export interface NotificationData {
  title: string;
  message: string;
  audienceType: AudienceType;
  audienceId?: string;
  selectedRoles?: string[];
  selectedUsers?: string[];
  sendEmail: boolean;
  sendWhatsapp: boolean;
  createdBy: string;
}

export interface NotificationDoc extends NotificationData {
  createdAt: Timestamp;
}

export type NotificationStatus = 'sent' | 'failed' | 'pending';

export interface NotificationLog {
  notificationId: string;
  userId: string;
  emailSent: boolean;
  whatsappSent: boolean;
  status: NotificationStatus;
  sentAt: Timestamp;
}
