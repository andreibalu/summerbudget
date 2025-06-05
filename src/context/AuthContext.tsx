
"use client";

import type { User, AuthError } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, googleAuthProvider } from '@/lib/firebase'; // Import googleAuthProvider
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, pass: string) => Promise<User | null | AuthError >;
  signIn: (email: string, pass: string) => Promise<User | null | AuthError >;
  signInWithGoogle: () => Promise<User | null | AuthError>; // Added
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string): Promise<User | null | AuthError > => {
    if (!auth) {
       const error = { code: "auth/unavailable", message: "Authentication service is not available."} as AuthError;
       toast({ variant: "destructive", title: "Sign Up Error", description: error.message });
       return error;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Sign Up Failed", description: authError.message });
      return authError;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string): Promise<User | null | AuthError> => {
     if (!auth) {
       const error = { code: "auth/unavailable", message: "Authentication service is not available."} as AuthError;
       toast({ variant: "destructive", title: "Sign In Error", description: error.message });
       return error;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Sign In Failed", description: authError.message });
      return authError;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<User | null | AuthError> => {
    if (!auth || !googleAuthProvider) {
      const error = { code: "auth/unavailable", message: "Google Authentication service is not available." } as AuthError;
      toast({ variant: "destructive", title: "Google Sign In Error", description: error.message });
      return error;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      // Handle specific Google sign-in errors, e.g., popup closed by user
      if (authError.code === 'auth/popup-closed-by-user') {
        toast({ variant: "default", title: "Google Sign In", description: "Sign-in process was cancelled." });
      } else {
        toast({ variant: "destructive", title: "Google Sign In Failed", description: authError.message });
      }
      return authError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) {
       toast({ variant: "destructive", title: "Sign Out Error", description: "Authentication service is not available." });
       return;
    }
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      router.push('/login');
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Sign Out Failed", description: authError.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
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
