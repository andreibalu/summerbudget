
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BudgetPlannerClient } from '@/components/budget/BudgetPlannerClient';
import { RoomModal } from '@/components/budget/RoomModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Users, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { ref, set as firebaseSet, get, remove as firebaseRemove, serverTimestamp } from "firebase/database";
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
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [userOwnedRoomId, setUserOwnedRoomId] = useState<string | null>(null);
  const [isLoadingRoomAction, setIsLoadingRoomAction] = useState(false);
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
  }, []);

  useEffect(() => {
    if (user && db) {
      const userCreatedRoomRef = ref(db, `users/${user.uid}/createdRoomId`);
      get(userCreatedRoomRef).then((snapshot) => {
        if (snapshot.exists()) {
          setUserOwnedRoomId(snapshot.val());
        } else {
          setUserOwnedRoomId(null);
        }
      }).catch(error => {
        console.error("Error fetching user's created room ID:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch your room data." });
      });
    } else {
      setUserOwnedRoomId(null); 
    }
  }, [user, toast]);

  const handleRoomModeButtonClick = async () => {
    if (!user || !db) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database not available." });
      return;
    }
    setIsLoadingRoomAction(true);
    try {
        if (currentRoomId) { // User is currently in a room. Action is to leave and go to personal mode.
            await handleLeaveRoom();
        } else {
            // User is currently in personal mode.
            if (userOwnedRoomId) {
                // User has an owned room, try to switch to it.
                const roomRef = ref(db, `rooms/${userOwnedRoomId}`);
                const snapshot = await get(roomRef);
                if (snapshot.exists()) {
                    // Before switching, ensure user is a member
                    const membersRef = ref(db, `rooms/${userOwnedRoomId}/members/${user.uid}`);
                    const memberSnapshot = await get(membersRef);
                    if (!memberSnapshot.exists() || memberSnapshot.val() !== true) {
                        await firebaseSet(membersRef, true); // Add them if not already a member
                    }
                    setCurrentRoomId(userOwnedRoomId);
                    toast({ title: "Switched to Your Room", description: `You are now in room: ${userOwnedRoomId}.` });
                } else {
                    // Owned room doesn't exist anymore (stale reference)
                    await firebaseRemove(ref(db, `users/${user.uid}/createdRoomId`));
                    setUserOwnedRoomId(null);
                    toast({ variant: "destructive", title: "Your Room Not Found", description: "Your previously created room no longer exists. Opening room options." });
                    setShowRoomModal(true);
                }
            } else {
                // User is in personal mode and has no owned room. Open modal to create/join.
                setShowRoomModal(true);
            }
        }
    } catch (error) {
        console.error("Error in room mode button click:", error);
        toast({ variant: "destructive", title: "Operation Failed", description: "An unexpected error occurred while handling room mode." });
    } finally {
        setIsLoadingRoomAction(false);
    }
  };


  const handleCreateRoom = async () => {
    if (!db || !user) {
      toast({ variant: "destructive", title: "Error", description: "Cannot create room. Database or user not available." });
      return "";
    }
    setIsLoadingRoomAction(true);
    const newRoomId = generateRoomCode();
    
    const newRoomData = {
      budgetData: initialBudgetData,
      meta: { createdBy: user.uid, createdAt: serverTimestamp() },
      members: { [user.uid]: true } 
    };
    
    try {
      await firebaseSet(ref(db, `rooms/${newRoomId}`), newRoomData);
      await firebaseSet(ref(db, `users/${user.uid}/createdRoomId`), newRoomId);
      
      setCurrentRoomId(newRoomId);
      setUserOwnedRoomId(newRoomId); 
      setShowRoomModal(false);
      toast({ title: "Room Created & Synced", description: `You are now in room: ${newRoomId}. This is now your primary room.` });
    } catch (error) {
      console.error("Failed to create room in Firebase:", error);
      const e = error as Error & { code?: string };
      if (e.code === 'PERMISSION_DENIED') {
          toast({ variant: "destructive", title: "Permission Denied", description: "Could not create room. Check Firebase rules."});
      } else {
          toast({ variant: "destructive", title: "Room Creation Failed", description: "Could not create the room. Check console." });
      }
    } finally {
      setIsLoadingRoomAction(false);
    }
    return newRoomId; 
  };

  const handleJoinRoom = async (roomIdToJoin: string) => {
    const upperRoomId = roomIdToJoin.toUpperCase();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(upperRoomId)) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Room code must be in XXX-XXX format." });
        return;
    }
    if (!db || !user) {
      toast({ variant: "destructive", title: "Error", description: "Cannot join room. Database or user not available." });
      return;
    }
    setIsLoadingRoomAction(true);
    const roomRef = ref(db, `rooms/${upperRoomId}`);
    try {
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        const membersRef = ref(db, `rooms/${upperRoomId}/members/${user.uid}`);
        await firebaseSet(membersRef, true); 
        setCurrentRoomId(upperRoomId);
        setShowRoomModal(false);
        toast({ title: "Joined Room", description: `Switched to room: ${upperRoomId}.` });
      } else {
        toast({ variant: "destructive", title: "Room Not Found", description: `Room ${upperRoomId} does not exist.` });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      const e = error as Error & { code?: string };
      if (e.code === 'PERMISSION_DENIED') {
          toast({ variant: "destructive", title: "Permission Denied", description: "Could not join room. You might not have permission to write to the members list."});
      } else {
        toast({ variant: "destructive", title: "Error Joining Room", description: "Could not verify or join room." });
      }
    } finally {
      setIsLoadingRoomAction(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!db || !user || !currentRoomId) {
      setCurrentRoomId(null); 
      setShowRoomModal(false);
      if (currentRoomId) { // Only show error if there was a room to leave
         toast({ variant: "destructive", title: "Error", description: "Cannot leave room. Missing required info or already in personal mode." });
      }
      return; 
    }

    const roomToLeaveId = currentRoomId; // Store currentRoomId before it's potentially nulled

    try {
      const membersRef = ref(db, `rooms/${roomToLeaveId}/members`);
      const membersSnapshot = await get(membersRef);
      const currentMembers = membersSnapshot.exists() ? membersSnapshot.val() : {};
      const numberOfMembers = Object.keys(currentMembers).length;
      const userWasMember = currentMembers.hasOwnProperty(user.uid);

      if (userWasMember && numberOfMembers === 1 && currentMembers[user.uid]) {
        // User is the only member, delete the room
        await firebaseRemove(ref(db, `rooms/${roomToLeaveId}`));
        toast({ title: "Room Left & Deleted", description: `Room ${roomToLeaveId} was empty and has been deleted.` });
        // If this was the user's owned room, clear their ownership reference
        if (userOwnedRoomId === roomToLeaveId) {
          await firebaseRemove(ref(db, `users/${user.uid}/createdRoomId`));
          setUserOwnedRoomId(null);
        }
      } else if (userWasMember) {
        // More than one member, or user is a member but not the only one. Just remove the user.
        await firebaseRemove(ref(db, `rooms/${roomToLeaveId}/members/${user.uid}`));
        toast({ title: "Room Left", description: `You have left room ${roomToLeaveId}. Switched to Personal Mode.` });
      } else if (!userWasMember && numberOfMembers > 0) {
         // User is trying to leave a room they are not a member of, but the room exists.
         toast({ title: "Switched to Personal Mode", description: `You were not an active member of room ${roomToLeaveId}.` });
         if (userOwnedRoomId === roomToLeaveId) { // Clear ownership if it pointed to this non-member room
            await firebaseRemove(ref(db, `users/${user.uid}/createdRoomId`));
            setUserOwnedRoomId(null);
        }
      }
      // If !userWasMember && numberOfMembers === 0, room is already effectively gone or user wasn't part of it.

    } catch (error) {
      console.error("Error leaving room:", error);
      const e = error as Error & { code?: string };
      if (e.code === 'PERMISSION_DENIED') {
          toast({ variant: "destructive", title: "Permission Denied", description: "Could not update room status. Check Firebase rules."});
      } else {
          toast({ variant: "destructive", title: "Error Leaving Room", description: "An error occurred. See console." });
      }
    } finally {
      // Always switch to personal mode visually, regardless of Firebase operation success
      setCurrentRoomId(null); 
      setShowRoomModal(false);
      // isLoadingRoomAction is handled by the caller (handleRoomModeButtonClick)
    }
  };
  
  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center justify-center font-body">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">{authLoading ? 'Authenticating...' : 'Redirecting to login...'}</p>
      </main>
    );
  }

  const getButtonTextAndIcon = () => {
    if (currentRoomId) {
      return { text: 'To Personal Mode', icon: <User className="mr-2 h-4 w-4" /> };
    }
    if (userOwnedRoomId) {
      return { text: 'My Room', icon: <Users className="mr-2 h-4 w-4" /> };
    }
    return { text: 'Room Options', icon: <Users className="mr-2 h-4 w-4" /> };
  };

  const { text: buttonText, icon: buttonIcon } = getButtonTextAndIcon();

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
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-4">
              {user.email && <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>}
               <Button variant="outline" onClick={handleRoomModeButtonClick} size="sm" className="w-auto sm:w-auto" disabled={isLoadingRoomAction}>
                {isLoadingRoomAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : buttonIcon}
                {buttonText}
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
          userHasActiveOwnedRoom={!!userOwnedRoomId} 
          onClose={() => setShowRoomModal(false)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={async () => { // Ensure RoomModal's leave also uses the main handler
            setIsLoadingRoomAction(true);
            try {
                await handleLeaveRoom();
            } finally {
                setIsLoadingRoomAction(false);
            }
          }}
          isLoading={isLoadingRoomAction}
        />
      )}
    </main>
  );
}
    

    