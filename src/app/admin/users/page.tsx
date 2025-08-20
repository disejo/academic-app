/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// NOTE: To enable bulk upload, you must install a spreadsheet library.
// Run the following command in your terminal:
// npm install xlsx
import * as XLSX from 'xlsx';
import UserManagementTable from '@/components/admin/UserManagementTable';

interface Tutor {
  id: string;
  name: string;
}

export default function CreateUserPage() {
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ESTUDIANTE');
  const [tutorId, setTutorId] = useState('');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTutors, setLoadingTutors] = useState(true);


  useEffect(() => {
    const fetchTutors = async () => {
      setLoadingTutors(true);
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'TUTOR'));
        const querySnapshot = await getDocs(q);
        const fetchedTutors = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        })) as Tutor[];
        setTutors(fetchedTutors);
      } catch (err: any) {
        console.error("Error al buscar tutores:", err);
        setError(err.message);
      } finally {
        setLoadingTutors(false);
      }
    };
    fetchTutors();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            email, 
            password, 
            name, 
            dni,
            phone, 
            role, 
            tutorId: role === 'ESTUDIANTE' && tutorId ? tutorId : undefined 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setName('');
        setDni('');
        setEmail('');
        setPassword('');
        setPhone('');
        setRole('ESTUDIANTE');
        setTutorId('');
      } else {
        setError(data.error || 'Ocurrió un error desconocido');
      }
    } catch (err: any) {
      console.error("Ocurrió un error:", err);
      setError("Error al crear el usuario. Por favor, compruebe la consola para más detalles.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setError("El archivo seleccionado está vacío o no se pudo leer.");
          setLoading(false);
          return;
        }

        const response = await fetch('/api/create-users-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(json),
        });

        const result = await response.json();

        if (response.ok) {
          let successMessage = `${result.successCount} usuarios creados con éxito.`;
          if (result.errorCount > 0) {
            successMessage += ` ${result.errorCount} usuarios fallaron.`;
            console.error("Errores de creación masiva:", result.errors);
            setError(`${result.errorCount} usuarios no pudieron ser creados. Compruebe la consola para más detalles.`);
          }
          setSuccess(successMessage);
        } else {
          setError(result.error || 'Ocurrió un error desconocido durante la creación masiva.');
        }

      } catch (parseError) {
        console.error("Error al procesar el archivo:", parseError);
        setError("Error al procesar el archivo. Asegúrese de que es un archivo XLSX/ODS válido y que el formato es correcto.");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = (err) => {
        console.error("Error de FileReader:", err);
        setError("Error al leer el archivo.");
        setLoading(false);
    }
    reader.readAsArrayBuffer(file);

    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8 mt-14 text-white dark:text-gray-100">
      <div className="w-full mx-auto bg-white dark:bg-gray-900 dark:text-gray-100 rounded-lg shadow-md p-6">
        
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-6 text-center">Crear Nuevo Usuario</h1>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-bold mb-2 dark:text-gray-300">Nombre:</label>
              <input type="text" id="name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="dni" className="block text-sm font-bold mb-2 dark:text-gray-300">DNI:</label>
              <input
                type="text"
                id="dni"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-bold mb-2 dark:text-gray-300">Email:</label>
              <input type="email" id="email" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-bold mb-2 dark:text-gray-300">Contraseña:</label>
              <input type="password" id="password" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-bold mb-2 dark:text-gray-300">Teléfono:</label>
              <input type="tel" id="phone" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-bold mb-2 dark:text-gray-300">Rol:</label>
              <select id="role" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="ADMIN">Admin</option>
                <option value="DOCENTE">Docente</option>
                <option value="ESTUDIANTE">Estudiante</option>
                <option value="DIRECTIVO">Directivo</option>
                <option value="PRECEPTOR">Preceptor</option>
                <option value="TUTOR">Tutor</option>
              </select>
            </div>
            {role === 'ESTUDIANTE' && (
              <div className="mb-4 md:col-span-2">
                <label htmlFor="tutor" className="block text-sm font-bold mb-2 dark:text-gray-300">Asignar Tutor (Opcional):</label>
                <select id="tutor" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                  <option value="">Ninguno</option>
                  {loadingTutors ? (
                    <option value="" disabled>Cargando tutores...</option>
                  ) : tutors.length > 0 ? tutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  )) : (
                    <option value="" disabled>No hay tutores disponibles</option>
                  )}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
                {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer" disabled={loading}>
                  {loading ? 'Creando Usuario...' : 'Crear Usuario'}
                </button>
            </div>
          </form>
        </div>

        <hr className="border-gray-300 dark:border-gray-600" />

        <div className="mt-10">
          <h1 className="text-3xl font-bold mb-6 text-center">Crear Usuarios en Lote</h1>
          {loading && (
            <div className="flex justify-center items-center p-6">
                <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-12 w-12"></div>
                <p className="ml-4">Procesando archivo...</p>
            </div>
          )}
          <div className={`p-6 border-2 border-dashed rounded-lg text-center dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${loading ? 'hidden' : ''}`}>
            <label htmlFor="bulk-upload" className="cursor-pointer text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Seleccione un archivo XLSX o ODS
            </label>
            <input id="bulk-upload" type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx, .ods, .csv" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">El archivo debe contener las columnas: Nombre, DNI, Email, Contraseña, Rol</p>
          </div>
        </div>

        <hr className="border-gray-300 dark:border-gray-600 my-10" />

        <UserManagementTable />

      </div>
    </div>
  );
}