
"use client";

import React, { useState, useEffect } from 'react';
import { BudgetPlannerClient } from '@/components/budget/BudgetPlannerClient';
import { RoomModal } from '@/components/budget/RoomModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Users, User, Loader2 } from 'lucide-react';
// ACTIVE_ROOM_ID_STORAGE_KEY is no longer needed
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { ref, set as firebaseSet, get } from "firebase/database";
import { initialBudgetData } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';

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
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null); // Will always start as null
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    // No longer persisting or retrieving room ID from localStorage
  }, []);

  const handleCreateRoom = (): string => {
    if (!db) {
      toast({ variant: "destructive", title: "Database Error", description: "Firebase Realtime Database is not connected. Cannot create room." });
      return "";
    }
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create a room." });
      return "";
    }
    const newRoomId = generateRoomCode();
    
    const newRoomData = {
      budgetData: initialBudgetData,
      meta: { createdBy: user.uid, createdAt: new Date().toISOString() },
      members: { [user.uid]: true }
    };
    
    firebaseSet(ref(db, `rooms/${newRoomId}`), newRoomData)
      .then(() => {
        setCurrentRoomId(newRoomId);
        // localStorage.setItem(ACTIVE_ROOM_ID_STORAGE_KEY, newRoomId); // Removed
        setShowRoomModal(false);
        toast({ title: "Room Created & Synced", description: `You are now in room: ${newRoomId}. Share this code.` });
      })
      .catch(error => {
        console.error("Failed to create room in Firebase:", error);
        toast({ variant: "destructive", title: "Room Creation Failed", description: "Could not create the room. Check console." });
      });
    return newRoomId; 
  };

  const handleJoinRoom = (roomIdToJoin: string) => {
    const upperRoomId = roomIdToJoin.toUpperCase();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(upperRoomId)) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Room code must be in XXX-XXX format." });
        return;
    }
    if (!db) {
      toast({ variant: "destructive", title: "Database Error", description: "Firebase Realtime Database is not connected." });
      return;
    }
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to join a room." });
      return;
    }

    const roomRef = ref(db, `rooms/${upperRoomId}`);
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        const membersRef = ref(db, `rooms/${upperRoomId}/members/${user.uid}`);
        firebaseSet(membersRef, true).then(() => {
          setCurrentRoomId(upperRoomId);
          // localStorage.setItem(ACTIVE_ROOM_ID_STORAGE_KEY, upperRoomId); // Removed
          setShowRoomModal(false);
          toast({ title: "Joined Room", description: `Switched to room: ${upperRoomId}.` });
        }).catch(error => {
          console.error("Failed to add user to room members:", error);
          toast({ variant: "destructive", title: "Join Failed", description: "Could not update room membership." });
        });
      } else {
        toast({ variant: "destructive", title: "Room Not Found", description: `Room ${upperRoomId} does not exist.` });
      }
    }).catch(error => {
      console.error("Error checking room existence:", error);
      toast({ variant: "destructive", title: "Error Joining Room", description: "Could not verify room." });
    });
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    // localStorage.removeItem(ACTIVE_ROOM_ID_STORAGE_KEY); // Removed
    setShowRoomModal(false); 
    toast({ title: "Personal Mode Activated", description: "Your budget is now private to your account." });
  };
  
  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center justify-center font-body">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">{authLoading ? 'Authenticating...' : 'Redirecting to login...'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center font-body">
      <Card className="w-full max-w-5xl shadow-xl rounded-lg">
        <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Leaf className="h-5 w-5 sm:h-6 md:h-8 text-primary" />
              <CardTitle className="text-lg text-center sm:text-left sm:text-xl md:text-3xl font-headline text-primary tracking-tight">
                Summer Budget
              </CardTitle>
              <Leaf className="h-5 w-5 sm:h-6 md:h-8 text-primary transform scale-x-[-1]" />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              {user.email && <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>}
               <Button variant="outline" onClick={() => setShowRoomModal(true)} size="sm" className="w-auto">
                {currentRoomId ? <Users className="mr-2 h-4 w-4" /> : <User className="mr-2 h-4 w-4" />}
                {currentRoomId ? 'Room Mode' : 'Personal Mode'}
              </Button>
              <LogoutButton />
            </div>
          </div>
          {currentRoomId && (
            <CardDescription className="text-center mt-2 text-sm text-muted-foreground">
              Room Code: <span className="font-semibold text-accent select-all">{currentRoomId}</span> (Real-time Sync)
            </CardDescription>
          )}
           {user.email && <span className="text-xs text-muted-foreground text-center mt-2 block sm:hidden">{user.email}</span>}
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <BudgetPlannerClient key={currentRoomId || user.uid} currentRoomId={currentRoomId} user={user} />
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-muted-foreground text-sm">
        {currentYear !== null ? (
          <p>&copy; {currentYear} Summer Budget. Plan your best summer!</p>
        ) : (
          <p>Loading copyright year...</p> 
        )}
      </footer>
      {user && ( 
        <RoomModal
          isOpen={showRoomModal}
          currentRoomId={currentRoomId}
          onClose={() => setShowRoomModal(false)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </main>
  );
}
