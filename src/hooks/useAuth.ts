/* eslint-disable react-hooks/exhaustive-deps */
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase'; // Import Firebase client-side auth and db
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';



interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  role: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const Router = useRouter();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        console.log("useAuth: Firebase user detected:", firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("useAuth: User profile from Firestore:", userData);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || firebaseUser.displayName,
              role: userData.role || null,
            });
          } else {
            // User exists in Auth but not in Firestore (shouldn't happen if creation is correct)
            console.warn("useAuth: User document not found in Firestore for UID:", firebaseUser.uid);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              role: null, // Default to null if role not found
            });
          }
        } catch (error) {
          console.error("useAuth: Error fetching user document from Firestore:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            role: null, // Default to null on error
          });
        }
      } else {
        // User is signed out
        console.log("useAuth: No Firebase user detected.");
        setUser(null);
        Router.push('/login'); // Redirect to login page
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { user, loading };
};