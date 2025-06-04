
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const { signOut, loading } = useAuth();

  return (
    <Button variant="outline" onClick={signOut} disabled={loading} size="sm">
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}
