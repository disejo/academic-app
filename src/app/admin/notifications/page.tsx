/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface User {
  id: string;
  name: string;
  role: string;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState('ROLES');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roles = ['DOCENTE', 'ADMIN', 'PRECEPTOR', 'TUTOR', 'ESTUDIANTE', 'DIRECTIVO'];

  const roleLabels: Record<string, string> = {
    DOCENTE: 'Docentes',
    ADMIN: 'Administradores',
    PRECEPTOR: 'Preceptores',
    TUTOR: 'Tutores',
    ESTUDIANTE: 'Estudiantes',
    DIRECTIVO: 'Directivos',
  };

  useEffect(() => {
    // fetch all users for the multi-select
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as User[];
        setUsers(arr.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error loading users', err);
      }
    };
    fetch();
  }, []);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !user.role || !['DIRECTIVO', 'PRECEPTOR'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Acceso Denegado</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Solo directivos y preceptores pueden enviar notificaciones.
          </p>
          <a href="/dashboard" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block">
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (audienceType === 'ROLES' && selectedRoles.length === 0) {
      setError('Seleccione al menos un rol');
      return;
    }
    if (audienceType === 'USERS' && selectedUsers.length === 0) {
      setError('Seleccione al menos un usuario');
      return;
    }
    if (!sendEmail && !sendWhatsapp) {
      setError('Seleccione al menos un canal de envío');
      return;
    }
    setLoading(true);

    try {
      const payload: any = {
        title,
        message,
        audienceType,
        sendEmail,
        sendWhatsapp,
        createdBy: user.uid,
      };
      if (audienceType === 'ROLES') {
        payload.selectedRoles = selectedRoles;
      } else if (audienceType === 'USERS') {
        payload.selectedUsers = selectedUsers;
      }
      const resp = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSuccess(`Notificación creada (destinatarios: ${data.recipientCount})`);
        setTitle('');
        setMessage('');
        setSelectedRoles([]);
        setSelectedUsers([]);
        setSendEmail(true);
        setSendWhatsapp(false);
      } else {
        setError(data.error || 'Error inesperado');
      }
    } catch (err: any) {
      console.error(err);
      setError('No se pudo enviar la notificación. Consulte la consola.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14">
      <div className="w-full mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 text-gray-900 dark:text-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-center">Enviar Notificación</h1>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Titulo</label>
            <input
              type="text"
              className="w-full shadow border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Mensaje</label>
            <textarea
              className="w-full shadow border rounded px-3 py-2 h-24 dark:bg-gray-700 dark:text-gray-100"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Tipo de Audiencia</label>
            <select
              className="w-full shadow border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value)}
            >
              <option value="ROLES">Seleccionar por roles</option>
              <option value="USERS">Seleccionar usuarios específicos</option>
            </select>
          </div>

          {audienceType === 'ROLES' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold">Roles</label>
                <button
                  type="button"
                  onClick={() => setSelectedRoles([])}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Limpiar
                </button>
              </div>
              <div className="space-y-2">
                {roles.map((role) => (
                  <label key={role} className="inline-flex items-center mr-4">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role));
                        }
                      }}
                      className="form-checkbox"
                    />
                    <span className="ml-2">{roleLabels[role] || role}</span>
                  </label>
                ))}
              </div>
              {selectedRoles.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Seleccionados: {selectedRoles.map(r => roleLabels[r] || r).join(', ')}
                </div>
              )}
            </div>
          )}

          {audienceType === 'USERS' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold">Usuarios</label>
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Limpiar
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 dark:bg-gray-700">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center space-x-2 mb-1">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, u.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                        }
                      }}
                      className="form-checkbox"
                    />
                    <span>{u.name} ({roleLabels[u.role] || u.role})</span>
                  </label>
                ))}
              </div>
              {selectedUsers.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Seleccionados ({selectedUsers.length}): {selectedUsers.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="form-checkbox"
              />
              <span className="ml-2">Enviar Email</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="form-checkbox"
              />
              <span className="ml-2">Enviar WhatsApp</span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
