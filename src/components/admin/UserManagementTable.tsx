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
        let usersQuery = collection(db, 'users');
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
        console.error("Error fetching users:", err);
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
      console.error("Error updating user:", err);
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
    <div className="mt-10 p-8 bg-white rounded shadow-md w-full max-w-4xl dark:bg-gray-900 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center">Manage Users</h2>

      <div className="mb-4">
        <label htmlFor="roleFilter" className="block text-sm font-bold mb-2 dark:text-gray-300">Filter by Role:</label>
        <select
          id="roleFilter"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="ALL">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-blue-500">Loading users...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && users.length === 0 && !error && (
        <p className="text-center text-gray-500">No users found.</p>
      )}

      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b dark:border-gray-700">Name</th>
                <th className="py-2 px-4 border-b dark:border-gray-700">Email</th>
                <th className="py-2 px-4 border-b dark:border-gray-700">DNI</th>
                <th className="py-2 px-4 border-b dark:border-gray-700">Phone</th>
                <th className="py-2 px-4 border-b dark:border-gray-700">Role</th>
                <th className="py-2 px-4 border-b dark:border-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  {editingUser?.id === user.id ? (
                    <>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <input
                          type="text"
                          name="name"
                          value={editingUser.name}
                          onChange={handleChange}
                          className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100"
                        />
                      </td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <input
                          type="email"
                          name="email"
                          value={editingUser.email}
                          onChange={handleChange}
                          className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100"
                        />
                      </td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <input
                          type="text"
                          name="dni"
                          value={editingUser.dni}
                          onChange={handleChange}
                          className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100"
                        />
                      </td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <input
                          type="tel"
                          name="phone"
                          value={editingUser.phone}
                          onChange={handleChange}
                          className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100"
                        />
                      </td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <select
                          name="role"
                          value={editingUser.role}
                          onChange={handleChange}
                          className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100"
                        >
                          {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <button
                          onClick={() => handleSave(user)}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs mr-2"
                          disabled={loading}
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-xs"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-4 border-b dark:border-gray-700">{user.name}</td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">{user.email}</td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">{user.dni}</td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">{user.phone}</td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">{user.role}</td>
                      <td className="py-2 px-4 border-b dark:border-gray-700">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                        >
                          Edit
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
