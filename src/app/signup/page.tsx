
"use client";

import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { AuthError } from 'firebase/auth';

export default function SignUpPage() {
  const { signUp, loading, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user) {
      router.replace('/'); // Redirect to budget planner if already logged in
    }
  }, [user, router]);

  const handleSignUp = async (values: { email: string; password: string }) => {
    const result = await signUp(values.email, values.password);
    if (result && 'uid' in result) {
      router.push('/');
    }
    // Error handling is done within useAuth hook via toasts
  };

  if(user) return null;

  return <AuthForm isSignUp onSubmit={handleSignUp} loading={loading} />;
}
