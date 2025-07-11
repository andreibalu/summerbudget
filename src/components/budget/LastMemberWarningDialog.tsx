"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from 'lucide-react';

interface LastMemberWarningDialogProps {
  isOpen: boolean;
  roomName: string | null;
  roomId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LastMemberWarningDialog({
  isOpen,
  roomName,
  roomId,
  onConfirm,
  onCancel
}: LastMemberWarningDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Room Permanently?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are the last member in room <strong>"{roomName || 'Unnamed Room'}"</strong> ({roomId}).
            </p>
            <p>
              <strong>Leaving this room will delete it permanently</strong>, including all budget data, 
              transaction history, and shared information.
            </p>
            <p className="text-muted-foreground">
              This action cannot be undone. Are you sure you want to proceed?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Stay in Room
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, Delete Room
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 