
"use client";

import React, { useState, useEffect } from 'react';
import { BudgetPlannerClient } from '@/components/budget/BudgetPlannerClient';
import { RoomModal } from '@/components/budget/RoomModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Users, User } from 'lucide-react';
import { ACTIVE_ROOM_ID_STORAGE_KEY } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; // Firebase RTDB
import { ref, set as firebaseSet } from "firebase/database";
import { initialBudgetData } from '@/lib/types';


function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 3; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${part1}-${part2}`;
}

export default function BudgetPlannerPage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear());
    const persistedRoomId = localStorage.getItem(ACTIVE_ROOM_ID_STORAGE_KEY);
    if (persistedRoomId) {
      setCurrentRoomId(persistedRoomId);
    }
  }, []);

  const handleCreateRoom = (): string => {
    if (!db) {
      toast({ variant: "destructive", title: "Database Error", description: "Firebase Realtime Database is not connected. Cannot create room." });
      return "";
    }
    const newRoomId = generateRoomCode();
    // Initialize room data in Firebase RTDB
    const roomDataRef = ref(db, `rooms/${newRoomId}/budgetData`);
    firebaseSet(roomDataRef, initialBudgetData)
      .then(() => {
        setCurrentRoomId(newRoomId);
        localStorage.setItem(ACTIVE_ROOM_ID_STORAGE_KEY, newRoomId);
        setShowRoomModal(false);
        toast({ title: "Room Created & Synced", description: `You are now in room: ${newRoomId}. Share this code.` });
      })
      .catch(error => {
        console.error("Failed to create room in Firebase:", error);
        toast({ variant: "destructive", title: "Room Creation Failed", description: "Could not create the room in the cloud. Check console." });
      });
    return newRoomId; // Return optimistic, actual set happens async
  };

  const handleJoinRoom = (roomIdToJoin: string) => {
    // Basic validation for room code format (optional but good)
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(roomIdToJoin.toUpperCase())) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Room code must be in XXX-XXX format (letters/numbers)." });
        return;
    }
    if (!db) {
      toast({ variant: "destructive", title: "Database Error", description: "Firebase Realtime Database is not connected. Cannot join room." });
      return;
    }
    // Note: Checking if room exists in DB before joining is complex with RTDB rules for "existence check only"
    // For now, we'll just set it. BudgetPlannerClient will handle loading or initializing if empty.
    setCurrentRoomId(roomIdToJoin.toUpperCase());
    localStorage.setItem(ACTIVE_ROOM_ID_STORAGE_KEY, roomIdToJoin.toUpperCase());
    setShowRoomModal(false);
    toast({ title: "Joined Room", description: `Switched to room: ${roomIdToJoin.toUpperCase()}. Data will sync if room exists.` });
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    localStorage.removeItem(ACTIVE_ROOM_ID_STORAGE_KEY);
    setShowRoomModal(false);
    toast({ title: "Left Room", description: "You are now in Personal Mode." });
  };
  
  if (!isClient) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center justify-center font-body">
        <Leaf className="h-16 w-16 text-primary animate-pulse" />
        <p className="text-muted-foreground mt-4">Loading Budget Planner...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center font-body">
      <Card className="w-full max-w-5xl shadow-xl rounded-lg">
        <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Leaf className="h-10 w-10 text-primary" />
              <CardTitle className="text-3xl md:text-4xl font-headline text-primary tracking-tight">
                Summer Budget
              </CardTitle>
              <Leaf className="h-10 w-10 text-primary transform scale-x-[-1]" />
            </div>
            <Button variant="outline" onClick={() => setShowRoomModal(true)} className="ml-4">
              {currentRoomId ? <Users className="mr-2 h-4 w-4" /> : <User className="mr-2 h-4 w-4" />}
              {currentRoomId ? 'Room Mode' : 'Personal Mode'}
            </Button>
          </div>
          {currentRoomId && (
            <CardDescription className="text-center mt-2 text-sm text-muted-foreground">
              Active Room Code: <span className="font-semibold text-accent select-all">{currentRoomId}</span> (Real-time Sync Active)
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <BudgetPlannerClient key={currentRoomId || 'personal'} currentRoomId={currentRoomId} />
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-muted-foreground text-sm">
        {currentYear !== null ? (
          <p>&copy; {currentYear} Summer Budget. Plan your best summer!</p>
        ) : (
          <p>Loading copyright year...</p> 
        )}
      </footer>
      <RoomModal
        isOpen={showRoomModal}
        currentRoomId={currentRoomId}
        onClose={() => setShowRoomModal(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onLeaveRoom={handleLeaveRoom}
      />
    </main>
  );
}
