
"use client";

import type { User, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode, useRef } from 'react';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null | AuthError>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const justSignedOut = useRef(false);
  const signOutInProgress = useRef(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (justSignedOut.current && currentUser) {
        // If we just manually signed out and onAuthStateChanged immediately
        // provides a user (likely from an active Google session),
        // we want to respect the manual sign-out.
        // Force setUser(null) and ensure the flag is reset.
        setUser(null); 
        if (!signOutInProgress.current && auth) { // Prevent re-entrant signout
            firebaseSignOut(auth).catch(err => {
                 console.error("Error during forced re-signout:", err);
            });
        }
        justSignedOut.current = false; 
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User | null | AuthError> => {
    if (!auth || !googleAuthProvider) {
      const error = { code: "auth/unavailable", message: "Google Authentication service is not available." } as AuthError;
      toast({ variant: "destructive", title: "Google Sign In Error", description: error.message, duration: 3000 });
      return error;
    }
    setLoading(true);
    justSignedOut.current = false; // Reset flag before explicit sign-in attempt
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      // onAuthStateChanged will handle setting the user
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/popup-closed-by-user') {
        toast({ variant: "default", title: "Google Sign In", description: "Sign-in process was cancelled.", duration: 3000 });
      } else if (authError.code === 'auth/cancelled-popup-request') {
        // Often occurs if another popup is already open.
        toast({ variant: "destructive", title: "Google Sign In Interrupted", description: "Another popup may be active. Please close it and try again.", duration: 5000 });
      }
      else {
        toast({ variant: "destructive", title: "Google Sign In Failed", description: authError.message, duration: 3000 });
      }
      return authError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) {
       toast({ variant: "destructive", title: "Sign Out Error", description: "Authentication service is not available.", duration: 3000 });
       return;
    }
    setLoading(true);
    signOutInProgress.current = true;
    justSignedOut.current = true;
    try {
      await firebaseSignOut(auth);
      setUser(null); // Explicitly set user to null here
      router.push('/');
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Sign Out Failed", description: authError.message, duration: 3000 });
    } finally {
      // Delay resetting the flag to give onAuthStateChanged a moment
      setTimeout(() => {
        justSignedOut.current = false;
        signOutInProgress.current = false;
        setLoading(false);
      }, 500); 
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
