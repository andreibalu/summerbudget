
"use client";

import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { AuthError } from 'firebase/auth';

export default function LoginPage() {
  const { signIn, loading, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user) {
      router.replace('/'); // Redirect to budget planner if already logged in
    }
  }, [user, router]);

  const handleSignIn = async (values: { email: string; password: string }) => {
    const result = await signIn(values.email, values.password);
    // Check if result is a User object (successful login)
    if (result && 'uid' in result) {
        router.push('/');
    }
    // Error handling is done within useAuth hook via toasts
  };
  
  if(user) return null; // Prevent flash of content if user is already logged in and redirecting

  return <AuthForm onSubmit={handleSignIn} loading={loading} />;
}
