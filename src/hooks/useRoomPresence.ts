import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, set, get, remove, serverTimestamp, onDisconnect } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { RoomMember, MemberPresence } from '@/lib/types';

export function useRoomPresence(user: User | null, currentRoomId: string | null) {
  const [activeMembers, setActiveMembers] = useState<{ [userId: string]: RoomMember }>({});
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isLastMember, setIsLastMember] = useState<boolean>(false);

  // Update presence when user joins a room
  const updatePresence = useCallback(async (roomId: string, isActive: boolean = true) => {
    if (!user || !db) return;

    const presenceRef = ref(db, `rooms/${roomId}/activeMembers/${user.uid}`);
    
    if (isActive) {
      const memberData: RoomMember = {
        userId: user.uid,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      await set(presenceRef, memberData);
      
      // Set up disconnect handler to mark as inactive when user leaves
      const disconnectRef = onDisconnect(presenceRef);
      await disconnectRef.set({
        ...memberData,
        isActive: false,
        lastSeen: serverTimestamp()
      });
      
      // Update last seen every 30 seconds
      const interval = setInterval(async () => {
        if (db) {
          const lastSeenRef = ref(db, `rooms/${roomId}/activeMembers/${user.uid}/lastSeen`);
          await set(lastSeenRef, Date.now());
        }
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      // User is leaving - mark as inactive
      const snapshot = await get(presenceRef);
      if (snapshot.exists()) {
        await set(presenceRef, {
          ...snapshot.val(),
          isActive: false,
          lastSeen: Date.now()
        });
      }
    }
  }, [user]);

  // Remove inactive members (cleanup)
  const cleanupInactiveMembers = useCallback(async (roomId: string) => {
    if (!db) return;

    const activeMembersRef = ref(db, `rooms/${roomId}/activeMembers`);
    const snapshot = await get(activeMembersRef);
    
    if (snapshot.exists()) {
      const members = snapshot.val();
      const now = Date.now();
      const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const [userId, member] of Object.entries(members as { [key: string]: RoomMember })) {
        const timeSinceLastSeen = now - member.lastSeen;
        
        if (!member.isActive && timeSinceLastSeen > INACTIVE_THRESHOLD) {
          // Remove inactive members after 5 minutes
          await remove(ref(db, `rooms/${roomId}/activeMembers/${userId}`));
        } else if (timeSinceLastSeen > STALE_THRESHOLD) {
          // Remove very old entries (24+ hours old)
          await remove(ref(db, `rooms/${roomId}/activeMembers/${userId}`));
        }
      }
      
      // Check if any members are left, if none, add a cleanup marker
      const updatedSnapshot = await get(activeMembersRef);
      if (!updatedSnapshot.exists() || Object.keys(updatedSnapshot.val() || {}).length === 0) {
        // Mark room as potentially empty for later cleanup
        const roomRef = ref(db, `rooms/${roomId}/meta/lastActivity`);
        await set(roomRef, now);
      }
    }
  }, []);

  // Listen to active members changes
  useEffect(() => {
    if (!currentRoomId || !db) {
      setActiveMembers({});
      setMemberCount(0);
      setIsLastMember(false);
      return;
    }

    const activeMembersRef = ref(db, `rooms/${currentRoomId}/activeMembers`);
    
    const unsubscribe = onValue(activeMembersRef, (snapshot) => {
      if (snapshot.exists()) {
        const members = snapshot.val() as { [userId: string]: RoomMember };
        const activeMembers = Object.fromEntries(
          Object.entries(members).filter(([_, member]) => member.isActive)
        );
        
        setActiveMembers(activeMembers);
        const count = Object.keys(activeMembers).length;
        setMemberCount(count);
        setIsLastMember(count === 1 && user?.uid ? user.uid in activeMembers : false);
      } else {
        setActiveMembers({});
        setMemberCount(0);
        setIsLastMember(false);
      }
    }, (error) => {
      // Handle permission errors or network issues
      console.error(`Error listening to active members for room ${currentRoomId}:`, error);
      
      const firebaseError = error as Error & { code?: string };
      if (firebaseError.code === 'PERMISSION_DENIED') {
        // User might have been removed from room
        setActiveMembers({});
        setMemberCount(0);
        setIsLastMember(false);
      }
      // For network errors, keep current state and retry will happen automatically
    });

    // Set up presence for current user
    if (user) {
      updatePresence(currentRoomId);
      // Clean up inactive members periodically
      const cleanupInterval = setInterval(() => {
        cleanupInactiveMembers(currentRoomId);
      }, 60000); // Every minute
      
      return () => {
        clearInterval(cleanupInterval);
        unsubscribe();
        // Mark as inactive when component unmounts
        updatePresence(currentRoomId, false);
      };
    }

    return unsubscribe;
  }, [currentRoomId, user, updatePresence, cleanupInactiveMembers]);

  // Join room function
  const joinRoom = useCallback((roomId: string) => {
    if (user) {
      updatePresence(roomId, true);
    }
  }, [user, updatePresence]);

  // Leave room function  
  const leaveRoom = useCallback((roomId: string) => {
    if (user) {
      updatePresence(roomId, false);
    }
  }, [user, updatePresence]);

  return {
    activeMembers,
    memberCount,
    isLastMember,
    joinRoom,
    leaveRoom
  };
} 