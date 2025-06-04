
"use client";

import type { User, AuthError } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, pass: string) => Promise<User | null | AuthError >;
  signIn: (email: string, pass: string) => Promise<User | null | AuthError >;
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
      // toast({ variant: "destructive", title: "Auth Error", description: "Firebase Auth not available." }); // Keep for critical init issues
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]); // toast dependency can be removed if no toast is called here

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
      // Success toast removed: toast({ title: "Sign Up Successful", description: "Welcome!" });
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
      // Success toast removed: toast({ title: "Sign In Successful", description: "Welcome back!" });
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Sign In Failed", description: authError.message });
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
      // Success toast removed: toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/login');
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: "destructive", title: "Sign Out Failed", description: authError.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
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
