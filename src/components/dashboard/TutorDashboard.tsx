'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  documentId,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link'; // Import Link

interface Student {
  id: string;
  name: string;
  email: string;
  dni: string;
}

export default function TutorDashboard() {
  const { user, loading: authLoading } = useAuth();
  console.log("TutorDashboard: Component rendered. Current user:", user, "Auth Loading:", authLoading);

  const [myChildren, setMyChildren] = useState<Student[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const fetchMyChildren = useCallback(async () => {
    console.log("TutorDashboard: fetchMyChildren called.");
    if (authLoading) {
      console.log("TutorDashboard: Auth still loading. Deferring fetchMyChildren.");
      return;
    }
    if (!user || !user.uid) {
      console.log("TutorDashboard: User or user.uid is missing after auth loaded. Cannot fetch children.");
      setLoadingChildren(false);
      return;
    }
    setLoadingChildren(true);
    try {
      console.log(`TutorDashboard: Fetching tutor document for UID: ${user.uid}`);
      const tutorRef = doc(db, 'users', user.uid);
      const tutorSnap = await getDoc(tutorRef);
      if (tutorSnap.exists()) {
        const tutorData = tutorSnap.data();
        const childrenIds = tutorData.children || [];
        console.log("TutorDashboard: Tutor data fetched. Children UIDs:", childrenIds);

        if (childrenIds.length > 0) {
          console.log("TutorDashboard: Querying for children details...");
          const studentsQuery = query(collection(db, 'users'), where(documentId(), 'in', childrenIds));
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          console.log("TutorDashboard: Children details fetched:", studentsData);
          setMyChildren(studentsData);
        } else {
          console.log("TutorDashboard: No children UIDs found in tutor document.");
          setMyChildren([]);
        }
      } else {
        console.log("TutorDashboard: Tutor document does not exist for UID:", user.uid);
      }
    } catch (err: any) {
      console.error("TutorDashboard: Error fetching children:", err);
      setError("Could not fetch your children's data.");
    } finally {
      setLoadingChildren(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchMyChildren();
  }, [fetchMyChildren]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`TutorDashboard: handleSearch called with searchTerm: "${searchTerm}"`);
    if (!searchTerm.trim()) {
      console.log("TutorDashboard: Search term is empty.");
      return;
    }
    setLoadingSearch(true);
    setError(null);
    setSearchResults([]);
    try {
      let combinedResults: Student[] = [];

      console.log(`TutorDashboard: Querying for DNI as string: "${searchTerm}"`);
      const stringQuery = query(
        collection(db, 'users'),
        where('role', '==', 'ESTUDIANTE'),
        where('dni', '==', searchTerm)
      );
      const stringSnapshot = await getDocs(stringQuery);
      const stringResults = stringSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      console.log("TutorDashboard: String DNI search results:", stringResults);
      combinedResults = combinedResults.concat(stringResults);

      const searchTermAsNumber = parseInt(searchTerm, 10);
      if (!isNaN(searchTermAsNumber)) {
        console.log(`TutorDashboard: Querying for DNI as number: ${searchTermAsNumber}`);
        const numberQuery = query(
          collection(db, 'users'),
          where('role', '==', 'ESTUDIANTE'),
          where('dni', '==', searchTermAsNumber)
        );
        const numberSnapshot = await getDocs(numberQuery);
        const numberResults = numberSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        console.log("TutorDashboard: Number DNI search results:", numberResults);
        combinedResults = combinedResults.concat(numberResults);
      }

      const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
      console.log("TutorDashboard: Unique combined search results:", uniqueResults);
      
      const myChildrenIds = new Set(myChildren.map(c => c.id));
      console.log("TutorDashboard: IDs of already associated children:", Array.from(myChildrenIds));
      const filteredResults = uniqueResults.filter(s => !myChildrenIds.has(s.id));
      console.log("TutorDashboard: Filtered search results (not already associated):", filteredResults);

      setSearchResults(filteredResults);
      if (filteredResults.length === 0) {
        setError("No student found with that DNI, or they are already associated with you.");
      }
    } catch (err: any) {
      console.error("TutorDashboard: Error searching for students:", err);
      setError("An error occurred while searching.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAssociateChild = async (studentId: string) => {
    console.log(`TutorDashboard: handleAssociateChild called for studentId: ${studentId}`);
    if (!user || !user.uid) {
      console.log("TutorDashboard: User or user.uid is missing. Cannot associate child.");
      return;
    }
    setError(null);
    try {
      console.log(`TutorDashboard: Adding student ${studentId} to tutor ${user.uid}'s children array.`);
      const tutorRef = doc(db, 'users', user.uid);
      await updateDoc(tutorRef, {
        children: arrayUnion(studentId)
      });

      console.log(`TutorDashboard: Setting tutorId ${user.uid} on student ${studentId}.`);
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        tutorId: user.uid
      });

      console.log("TutorDashboard: Association successful. Refreshing children list and clearing search.");
      await fetchMyChildren();
      setSearchTerm('');
      setSearchResults([]);

    } catch (err: any) {
      console.error("TutorDashboard: Error associating child:", err);
      setError("Failed to associate child.");
    }
  };

  if (authLoading) {
    return <div className="mt-8 text-center text-gray-900 dark:text-gray-100">Cargando autenticación...</div>;
  }

  if (!user) {
    return <div className="mt-8 text-center text-red-500">No user logged in. Please log in as a Tutor.</div>;
  }

  return (
    <div className="mt-8 text-gray-900 dark:text-gray-100">
      <h2 className="text-xl font-semibold mb-4">Tutor Dashboard</h2>
      
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-3">My Children</h3>
        {loadingChildren ? (
          <p>Loading...</p>
        ) : myChildren.length > 0 ? (
          <ul className="space-y-2">
            {myChildren.map(child => (
              <li key={child.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <Link href={`/tutor/students/${child.id}`} legacyBehavior>
                  <a className="block hover:text-blue-500 dark:hover:text-blue-400">
                    {child.name} (DNI: {child.dni})
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">You have no children associated with your account yet.</p>
        )}
      </div>

      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-3">Find & Associate Your Child</h3>
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter your child's DNI"
              className="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            />
            <button type="submit" disabled={loadingSearch} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
              {loadingSearch ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && <p className="text-red-500 mt-3">{error}</p>}

        {searchResults.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold">Search Results:</h4>
            <ul className="space-y-2 mt-2">
              {searchResults.map(student => (
                <li key={student.id} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <span>{student.name} (DNI: {student.dni})</span>
                  <button onClick={() => handleAssociateChild(student.id)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md hover:bg-green-600">
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}