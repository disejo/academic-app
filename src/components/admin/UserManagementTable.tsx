'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  dni: string;
  phone: string;
  role: string;
  tutorId?: string;
}

const roles = ["ADMIN", "DOCENTE", "ESTUDIANTE", "DIRECTIVO", "PRECEPTOR", "TUTOR"];

export default function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('ALL'); // 'ALL' or a specific role
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        let usersQuery: any = collection(db, 'users');
        if (filterRole !== 'ALL') {
          usersQuery = query(usersQuery, where('role', '==', filterRole));
        }
        const querySnapshot = await getDocs(usersQuery);
        const fetchedUsers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(fetchedUsers);
      } catch (err: any) {
        console.error("Error al buscar usuarios:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [filterRole]);

  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
  };

  const handleSave = async (user: User) => {
    if (!editingUser) return;

    setLoading(true); // Set loading for save operation
    setError(null);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: editingUser.name,
        email: editingUser.email,
        dni: editingUser.dni,
        phone: editingUser.phone,
        role: editingUser.role,
        tutorId: editingUser.tutorId || null, // Ensure tutorId is null if not set
      });
      setUsers(users.map(u => u.id === user.id ? editingUser : u));
      setEditingUser(null);
    } catch (err: any) {
      console.error("Error al actualizar el usuario:", err);
      setError(err.message);
    } finally {
      setLoading(false); // Unset loading
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        [e.target.name]: e.target.value,
      });
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-md dark:bg-gray-900 dark:text-gray-100">
      <h2 className="text-3xl font-bold mb-6 text-center">Gestionar Usuarios</h2>

      <div className="mb-4">
        <label htmlFor="roleFilter" className="block text-sm font-bold mb-2 dark:text-gray-300">Filtrar por Rol:</label>
        <select
          id="roleFilter"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="ALL">Todos los Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-blue-500">Cargando usuarios...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && users.length === 0 && !error && (
        <p className="text-center text-gray-500">No se encontraron usuarios.</p>
      )}

      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DNI</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teléfono</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rol</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  {editingUser?.id === user.id ? (
                    <>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <input
                          type="text"
                          name="name"
                          value={editingUser.name}
                          onChange={handleChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                        />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <input
                          type="email"
                          name="email"
                          value={editingUser.email}
                          onChange={handleChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                        />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <input
                          type="text"
                          name="dni"
                          value={editingUser.dni}
                          onChange={handleChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                        />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <input
                          type="tel"
                          name="phone"
                          value={editingUser.phone}
                          onChange={handleChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                        />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <select
                          name="role"
                          value={editingUser.role}
                          onChange={handleChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                        >
                          {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleSave(user)}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                          disabled={loading}
                        >
                          {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-4 px-4 whitespace-nowrap">{user.name}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{user.email}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{user.dni}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{user.phone}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{user.role}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}