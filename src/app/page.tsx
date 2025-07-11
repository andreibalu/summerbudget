
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BudgetPlannerClient } from '@/components/budget/BudgetPlannerClient';
import { RoomModal } from '@/components/budget/RoomModal';
import { LastMemberWarningDialog } from '@/components/budget/LastMemberWarningDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Leaf, Users, Loader2, MenuIcon, UserSquare, DoorOpen, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { db } from '@/lib/firebase';
import { ref, set as firebaseSet, get, remove as firebaseRemove, serverTimestamp, runTransaction } from "firebase/database";
import { initialBudgetData } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
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
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [userOwnedRoomId, setUserOwnedRoomId] = useState<string | null>(null);
  const [isLoadingRoomAction, setIsLoadingRoomAction] = useState(false);
  const [showLastMemberWarning, setShowLastMemberWarning] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { activeMembers, memberCount, isLastMember, joinRoom, leaveRoom } = useRoomPresence(user, currentRoomId); 


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (user && db) {
      const userCreatedRoomRef = ref(db, `users/${user.uid}/createdRoomId`);
      get(userCreatedRoomRef).then((snapshot) => {
        if (snapshot.exists()) {
          const ownedRoom = snapshot.val();
          if (typeof ownedRoom === 'string') {
             setUserOwnedRoomId(ownedRoom);
          } else {
            setUserOwnedRoomId(null); // Clear if not a string
          }
        } else {
          setUserOwnedRoomId(null);
        }
      }).catch(error => {
        console.error("Error fetching user's created room ID:", error);
        setUserOwnedRoomId(null); // Ensure reset on error
      });
    } else {
      setUserOwnedRoomId(null);
    }
  }, [user]); 


  const handleRoomModeButtonClick = async () => {
    if (!user || !db) {
      return;
    }

    setIsLoadingRoomAction(true);
    try {
      if (currentRoomId) { 
        // Already in a room, pressing the button likely means "go to personal/options"
        // This case is handled by DropdownMenu options now.
        // For safety, if this function is called while in a room (e.g. direct call not from menu),
        // it could default to opening the room modal or switching to personal.
        // For now, assume the dropdown handles "in room" actions.
        // If we want "My Room" button to switch to Personal if currently in a different room:
        // setCurrentRoomId(null); 
        // setCurrentRoomName(null);
        // But this isn't the current flow. The button text/action changes.
      } else if (userOwnedRoomId) { 
          const roomRef = ref(db, `rooms/${userOwnedRoomId}`);
          const snapshot = await get(roomRef);
          if (snapshot.exists()) {
              const roomData = snapshot.val();
              const membersRef = ref(db, `rooms/${userOwnedRoomId}/members/${user.uid}`);
              const memberSnapshot = await get(membersRef);
              
              if (!memberSnapshot.exists() || memberSnapshot.val() !== true) {
                  await firebaseSet(membersRef, true); 
              }
              setCurrentRoomId(userOwnedRoomId);
              setCurrentRoomName(roomData.meta?.roomName || null);
              
              // Join the room presence tracking
              joinRoom(userOwnedRoomId);
          } else { 
              // Owned room ID exists but room itself doesn't in DB. Clean up.
              await firebaseRemove(ref(db, `users/${user.uid}/createdRoomId`));
              setUserOwnedRoomId(null); 
              setCurrentRoomName(null);
              // toast({ variant: "default", title: "Room Not Found", description: "Your previously owned room seems to be gone. Opening room options." });
              setShowRoomModal(true); 
          }
      } else { 
          setShowRoomModal(true); 
      }
    } catch (error) {
        console.error("Error in room mode button click:", error);
        // toast({ variant: "destructive", title: "Operation Failed", description: "An unexpected error occurred while handling room mode." });
    } finally {
        setIsLoadingRoomAction(false);
    }
  };

  const handleCreateRoom = async (roomName: string): Promise<string> => {
    if (!db || !user) {
      toast({ variant: "destructive", title: "Error", description: "Cannot create room. Database or user not available." });
      return "";
    }
    setIsLoadingRoomAction(true);
    const newRoomId = generateRoomCode();

    const newRoomData = {
      budgetData: initialBudgetData,
      meta: { createdBy: user.uid, createdAt: serverTimestamp(), roomName: roomName },
      members: { [user.uid]: true }
    };

    try {
      await firebaseSet(ref(db, `rooms/${newRoomId}`), newRoomData);
      await firebaseSet(ref(db, `users/${user.uid}/createdRoomId`), newRoomId);

      setCurrentRoomId(newRoomId);
      setCurrentRoomName(roomName);
      setUserOwnedRoomId(newRoomId); 
      setShowRoomModal(false);
      
      // Join the room presence tracking
      joinRoom(newRoomId);
      
      return newRoomId;
    } catch (error) {
      console.error("Failed to create room in Firebase:", error);
      const e = error as Error & { code?: string };
      if (e.code === 'PERMISSION_DENIED') {
          // toast({ variant: "destructive", title: "Permission Denied", description: "Could not create room. Check Firebase rules."});
      } else {
          // toast({ variant: "destructive", title: "Room Creation Failed", description: "Could not create the room. Check console." });
      }
      return "";
    } finally {
      setIsLoadingRoomAction(false);
    }
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
        const roomData = snapshot.val();
        const membersRef = ref(db, `rooms/${upperRoomId}/members/${user.uid}`);
        await firebaseSet(membersRef, true);

        // Confirmation step: try to read the membership back
        const memberSnapshot = await get(membersRef);
        if (memberSnapshot.val() !== true) {
            console.error("Failed to confirm membership immediately after joining for room:", upperRoomId);
            throw new Error("Membership confirmation failed post-join. Rules might not have propagated or write failed silently.");
        }

        setCurrentRoomId(upperRoomId);
        setCurrentRoomName(roomData.meta?.roomName || null);
        setShowRoomModal(false);
        
        // Join the room presence tracking
        joinRoom(upperRoomId);
      } else {
        toast({ variant: "destructive", title: "Room Not Found", description: `Room ${upperRoomId} does not exist.` });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      const e = error as Error & { code?: string };
      if (e.code === 'PERMISSION_DENIED') {
          toast({ variant: "destructive", title: "Permission Denied", description: "Could not join room. You might not have permission to write to the members list, or read confirmation failed."});
      } else {
        toast({ variant: "destructive", title: "Error Joining Room", description: (error as Error).message || "Could not verify or join room." });
      }
    } finally {
      setIsLoadingRoomAction(false);
    }
  };

 const handleLeaveRoomOperations = async () => {
    if (!db || !user || !currentRoomId) {
      setCurrentRoomId(null); 
      setCurrentRoomName(null);
      setShowRoomModal(false); 
      return;
    }

    // Check if user is the last member - show warning dialog
    if (isLastMember) {
      setShowLastMemberWarning(true);
      return;
    }

    // Proceed with normal leave operation
    await performLeaveRoom();
  };

  const performLeaveRoom = async () => {
    if (!db || !user || !currentRoomId) return;

    const roomToLeaveId = currentRoomId;
    
    // Update presence first
    leaveRoom(roomToLeaveId);
    
    // Optimistically update UI
    setCurrentRoomId(null);
    setCurrentRoomName(null);
    setShowRoomModal(false); 
    setShowLastMemberWarning(false);

    setIsLoadingRoomAction(true);

    try {
      // Use a transaction to atomically check and update membership
      const roomRef = ref(db, `rooms/${roomToLeaveId}`);
      const result = await runTransaction(roomRef, (currentRoomData) => {
        if (!currentRoomData) {
          // Room doesn't exist anymore
          return null;
        }

        const members = currentRoomData.members || {};
        const memberIds = Object.keys(members).filter(uid => members[uid] === true);
        
        if (!members[user.uid]) {
          // User is not a member anymore
          return currentRoomData;
        }

        // Remove the user from members
        delete members[user.uid];
        const remainingMembers = Object.keys(members).filter(uid => members[uid] === true);

        if (remainingMembers.length === 0) {
          // No members left, delete the room
          return null;
        } else {
          // Update the room with user removed
          return {
            ...currentRoomData,
            members: members
          };
        }
      });

      if (result.committed) {
        if (!result.snapshot.exists()) {
          // Room was deleted
          if (userOwnedRoomId === roomToLeaveId) { 
            await firebaseRemove(ref(db, `users/${user.uid}/createdRoomId`));
            setUserOwnedRoomId(null); 
          }
          toast({ 
            title: "Room Deleted", 
            description: `Room "${currentRoomName || 'Unnamed Room'}" has been permanently deleted.` 
          });
        } else {
          // User was removed from room
          toast({ 
            title: "Left Room", 
            description: `You have left room "${currentRoomName || 'Unnamed Room'}".` 
          });
        }
      } else {
        // Transaction failed due to conflict, retry might be needed
        console.warn("Room leave transaction failed, room state may have changed");
        toast({ 
          variant: "destructive", 
          title: "Operation Failed", 
          description: "Room state changed during operation. Please try again." 
        });
      }
    } catch (error) {
      console.error("Error leaving/deleting room:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to leave room. Please try again." 
      });
    } finally {
      setIsLoadingRoomAction(false);
    }
  };

  const handleSwitchToPersonalModeVisualOnly = () => {
    if (!currentRoomId) return; 
    
    // Leave room presence tracking
    if (currentRoomId) {
      leaveRoom(currentRoomId);
    }
    
    setCurrentRoomId(null);
    setCurrentRoomName(null);
  };

  // Handle edge case: room becomes unavailable while user is in it
  useEffect(() => {
    if (!currentRoomId || !db || !user) return;

    const roomRef = ref(db, `rooms/${currentRoomId}`);
    const checkRoomExists = async () => {
      try {
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
          // Room was deleted, switch to personal mode
          setCurrentRoomId(null);
          setCurrentRoomName(null);
          toast({
            variant: "destructive",
            title: "Room No Longer Exists",
            description: "The room you were in has been deleted. Switched to personal mode."
          });
        }
      } catch (error) {
        const e = error as Error & { code?: string };
        if (e.code === 'PERMISSION_DENIED') {
          // User was removed from room
          setCurrentRoomId(null);
          setCurrentRoomName(null);
          toast({
            variant: "destructive", 
            title: "Removed from Room",
            description: "You no longer have access to this room. Switched to personal mode."
          });
        }
      }
    };

    // Check room existence periodically (every 30 seconds)
    const interval = setInterval(checkRoomExists, 30000);
    
    return () => clearInterval(interval);
  }, [currentRoomId, db, user, toast]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center justify-center font-body">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Authenticating...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center justify-center font-body">
        <Card className="w-full max-w-md shadow-xl rounded-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Leaf className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline text-green-600">Welcome to Summer Budget</CardTitle>
            <CardDescription>Please sign in with Google to continue and unlock all features.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            <Button onClick={signInWithGoogle} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
              Sign in with Google
            </Button>
             <p className="text-xs text-muted-foreground text-center mt-2">
              Sign in to save your budget, share with friends in rooms, and get AI-powered spending tips!
            </p>
          </CardContent>
        </Card>
          <footer className="mt-8 text-center text-muted-foreground text-sm">
            {currentYear !== null ? (
              <p>&copy; {currentYear} Summer Budget. Plan your best summer!</p>
            ) : (
              <p>Loading copyright year...</p>
            )}
          </footer>
      </main>
    );
  }

  const getPersonalModeButtonDetails = () => {
    if (userOwnedRoomId) {
      return { text: 'My Room', icon: <Users className="mr-2 h-4 w-4" /> };
    }
    return { text: 'Rooms', icon: <Users className="mr-2 h-4 w-4" /> };
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center font-body">
      <Card className="w-full max-w-5xl shadow-xl rounded-lg">
        <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Leaf className="h-5 w-5 sm:h-6 md:h-8 text-primary" />
              <CardTitle className="text-lg text-center sm:text-left sm:text-xl md:text-3xl font-headline text-green-600 tracking-tight">
                Summer Budget
              </CardTitle>
              <Leaf className="h-5 w-5 sm:h-6 md:h-8 text-primary transform scale-x-[-1]" />
            </div>
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-4">
              {user.email && <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>}

              {currentRoomId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-auto sm:w-auto" disabled={isLoadingRoomAction}>
                      {isLoadingRoomAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MenuIcon className="mr-2 h-4 w-4" />}
                      Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSwitchToPersonalModeVisualOnly} disabled={isLoadingRoomAction}>
                      <UserSquare className="mr-2 h-4 w-4" />
                      Switch to Personal Mode
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLeaveRoomOperations} disabled={isLoadingRoomAction}>
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Leave Current Room
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <LogoutButton />
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="outline" onClick={handleRoomModeButtonClick} size="sm" className="w-auto sm:w-auto" disabled={isLoadingRoomAction}>
                    {isLoadingRoomAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : getPersonalModeButtonDetails().icon}
                    {getPersonalModeButtonDetails().text}
                  </Button>
                  <LogoutButton />
                </>
              )}
            </div>
          </div>
          {currentRoomId && (
            <CardDescription className="text-center mt-2 text-sm text-muted-foreground">
              Room: <span className="font-semibold text-accent">{currentRoomName || 'Unnamed Room'}</span> (<span className="font-semibold text-accent select-all">{currentRoomId}</span>)
              {memberCount > 0 && (
                <span className="ml-2">• {memberCount} active member{memberCount === 1 ? '' : 's'}</span>
              )}
            </CardDescription>
          )}
           {user.email && <span className="text-xs text-muted-foreground text-center mt-2 block sm:hidden">{user.email}</span>}
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <BudgetPlannerClient key={currentRoomId || user?.uid || 'anonymous-user'} currentRoomId={currentRoomId} user={user} />
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
        <>
          <RoomModal
            isOpen={showRoomModal}
            currentRoomId={currentRoomId}
            currentRoomName={currentRoomName}
            userHasActiveOwnedRoom={!!userOwnedRoomId}
            onClose={() => setShowRoomModal(false)}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLeaveRoom={handleLeaveRoomOperations} 
            isLoading={isLoadingRoomAction}
          />
          
          <LastMemberWarningDialog
            isOpen={showLastMemberWarning}
            roomName={currentRoomName}
            roomId={currentRoomId || ''}
            onConfirm={performLeaveRoom}
            onCancel={() => setShowLastMemberWarning(false)}
          />
        </>
      )}
    </main>
  );
}
    

  