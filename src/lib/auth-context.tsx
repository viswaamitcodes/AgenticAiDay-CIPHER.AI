
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    type User as FirebaseAuthUser,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signInWithPopup,
    getAdditionalUserInfo
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';
import type { UserProfile } from './types';

const auth = getAuth(app);

interface AuthContextType {
  user: FirebaseAuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  logIn: (email: string, pass: string) => Promise<void>;
  logOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
            // This case can happen with a new user from a redirect sign-in.
            // We check for redirect result below.
            setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    
    // Handle redirect result
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const firebaseUser = result.user;
          const additionalInfo = getAdditionalUserInfo(result);
          
          if (additionalInfo?.isNewUser) {
            const newUserProfile: Omit<UserProfile, 'id' | 'lastActive'> = {
                name: firebaseUser.displayName || 'Google User',
                email: firebaseUser.email!,
                role: 'Operator', // Default role
                avatar: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.email}`,
            };
            await setDoc(doc(db, "users", firebaseUser.uid), {
                ...newUserProfile,
                id: firebaseUser.uid,
                lastActive: serverTimestamp()
            });
          }
        }
      })
      .catch((error) => {
        console.error("Google sign-in redirect error:", error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      // Add user to the 'users' collection in Firestore
      const newUserProfile: Omit<UserProfile, 'id' | 'lastActive'> = {
        name,
        email,
        role: 'Operator', // Default role for new sign-ups
        avatar: `https://i.pravatar.cc/150?u=${email}`,
      };
      
      await setDoc(doc(db, "users", firebaseUser.uid), {
        ...newUserProfile,
        id: firebaseUser.uid,
        lastActive: serverTimestamp()
      });

      setUser(firebaseUser);
      setUserProfile({ 
          ...newUserProfile, 
          id: firebaseUser.uid, 
          lastActive: new Date().toISOString() 
      });

    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
    } catch (err: any) {
        console.error("Google sign-in error:", err);
        setError(err.message || 'Could not sign in with Google.');
    } finally {
        // setLoading(false) is not called here, as the page will redirect.
    }
  };


  const logOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = { user, userProfile, loading, signUp, logIn, logOut, signInWithGoogle };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
