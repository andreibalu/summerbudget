
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Keep to potentially see if user is loaded before redirecting

export default function LoginPage() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();

  useEffect(() => {
    // This page is obsolete. Always redirect to the main page.
    // The main page will handle showing login prompts if the user is not authenticated.
    if (!authLoading) { // Wait for auth state to be resolved before redirecting
        router.replace('/');
    }
  }, [router, authLoading, user]);

  // Render null or a minimal loader while auth state is resolving and redirecting
  return null;
}
