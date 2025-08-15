'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [loadingTutors, setLoadingTutors] = useState(true);
  const router = useRouter();

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
        console.error("Error fetching tutors:", err);
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
        setError(data.error || 'An unknown error occurred');
      }
    } catch (err: any) {
      console.error("An error occurred:", err);
      setError("Failed to create user. Please check the console for details.");
    }
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setError("The selected file is empty or could not be read.");
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
          let successMessage = `${result.successCount} users created successfully.`;
          if (result.errorCount > 0) {
            successMessage += ` ${result.errorCount} users failed.`;
            console.error("Bulk creation errors:", result.errors);
            setError(`${result.errorCount} users failed to create. Check console for details.`);
          }
          setSuccess(successMessage);
        } else {
          setError(result.error || 'An unknown error occurred during bulk creation.');
        }

      } catch (parseError) {
        console.error("Error processing file:", parseError);
        setError("Failed to process the file. Make sure it is a valid XLSX/ODS file and the format is correct.");
      }
    };
    reader.onerror = (err) => {
        console.error("FileReader error:", err);
        setError("Failed to read the file.");
    }
    reader.readAsArrayBuffer(file);

    event.target.value = '';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md dark:bg-gray-900 dark:text-gray-100">
        
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-6 text-center">Create New User</h1>
          <form onSubmit={handleCreateUser}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-bold mb-2 dark:text-gray-300">Name:</label>
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
              <label htmlFor="password" className="block text-sm font-bold mb-2 dark:text-gray-300">Password:</label>
              <input type="password" id="password" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-bold mb-2 dark:text-gray-300">Phone:</label>
              <input type="tel" id="phone" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-bold mb-2 dark:text-gray-300">Role:</label>
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
              <div className="mb-4">
                <label htmlFor="tutor" className="block text-sm font-bold mb-2 dark:text-gray-300">Assign Tutor (Optional):</label>
                <select id="tutor" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                  <option value="">None</option>
                  {tutors.length > 0 ? tutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  )) : (
                    <option value="" disabled>No Tutors Available</option>
                  )}
                </select>
              </div>
            )}
            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full cursor-pointer">Create User</button>
          </form>
        </div>

        <hr className="border-gray-300 dark:border-gray-600" />

        <div className="mt-10">
          <h1 className="text-2xl font-bold mb-6 text-center">Bulk Create Users</h1>
          <div className="p-4 border-2 border-dashed rounded-lg text-center dark:border-gray-600">
            <label htmlFor="bulk-upload" className="cursor-pointer text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
              Select an XLSX or ODS file
            </label>
            <input id="bulk-upload" type="file" className="hidden" onChange={handleBulkUpload} accept=".xlsx, .ods, .csv" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">File must contain columns: Name, DNI, Email, Password, Role</p>
          </div>
        </div>

        <hr className="border-gray-300 dark:border-gray-600 my-10" />

        <UserManagementTable />

      </div>
    </div>
  );
}