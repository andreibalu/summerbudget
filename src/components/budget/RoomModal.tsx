
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface RoomModalProps {
  isOpen: boolean;
  currentRoomId: string | null;
  userHasActiveOwnedRoom: boolean; 
  onClose: () => void;
  onCreateRoom: () => Promise<string>; 
  onJoinRoom: (roomId: string) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  isLoading: boolean;
}

export function RoomModal({ 
  isOpen, 
  currentRoomId, 
  userHasActiveOwnedRoom,
  onClose, 
  onCreateRoom, 
  onJoinRoom, 
  onLeaveRoom,
  isLoading 
}: RoomModalProps) {
  const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreateRoomClick = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to create a room." });
      return;
    }
    // If user has an active owned room and is currently in personal mode,
    // this button press (via page.tsx) might directly take them to their room
    // or if they are in another room, it creates a new primary room.
    // The RoomModal's 'Create New Room' should always attempt to create a new one.
    await onCreateRoom(); 
  };

  const handleJoinRoomClick = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to join a room." });
      return;
    }
    const codeToJoin = joinRoomIdInput.trim().toUpperCase();
    if (codeToJoin) {
      if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(codeToJoin)) {
        toast({ variant: "destructive", title: "Invalid Format", description: "Room code must be like XXX-XXX." });
        return;
      }
      await onJoinRoom(codeToJoin);
      setJoinRoomIdInput(''); 
    } else {
       toast({ variant: "destructive", title: "Input Required", description: "Please enter a room code to join." });
    }
  };

  const handleCopyToClipboard = () => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId).then(() => {
        toast({ title: "Room Code Copied!", description: "You can now share it." });
      }).catch(err => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy room code." });
        console.error('Failed to copy room code: ', err);
      });
    }
  };

  if (!user) { 
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share & Join Budget Room</DialogTitle>
          <DialogDescription>
            {currentRoomId 
              ? `You are in room: ${currentRoomId}. Data is synced in real-time.`
              : (userHasActiveOwnedRoom 
                  ? "You have an existing room. Click 'My Room' on the main page to access it, or create a new one below (this will become your new primary room)."
                  : "Create a new room for real-time sharing or join one using a code. Your personal budget is private to your account."
                )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {currentRoomId ? (
            <div className="space-y-2">
              <Label>Current Room Code</Label>
              <div className="flex items-center space-x-2">
                <Input value={currentRoomId} readOnly className="font-mono"/>
                <Button variant="outline" size="icon" onClick={handleCopyToClipboard} disabled={isLoading}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy Room Code</span>
                </Button>
              </div>
              <Button onClick={onLeaveRoom} variant="destructive" className="w-full mt-4" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Switch to Personal Mode & Leave Room
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <Button onClick={handleCreateRoomClick} className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create New Shared Room
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Generates a unique code (e.g., ABC-123) for real-time sync. This will become your primary room.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-code" className="text-left">
                  Join an Existing Room
                </Label>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    id="room-code"
                    value={joinRoomIdInput}
                    onChange={(e) => setJoinRoomIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g., XYZ-789"
                    maxLength={7} 
                    disabled={isLoading}
                  />
                  <Button onClick={handleJoinRoomClick} disabled={isLoading || !joinRoomIdInput.trim() || joinRoomIdInput.trim().length !== 7}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Join
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter the code from a budget sheet shared with you.</p>
              </div>
            </>
          )}
           <div className="mt-4 p-3 bg-accent/10 rounded-md border border-accent/50">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-accent mr-2 shrink-0" />
              <p className="text-xs text-accent-foreground">
                <strong>Real-time Sync:</strong> When in a room, data is stored in Firebase Realtime Database and synced live. Personal mode saves your budget privately to your account in the cloud. Your 'My Room' is your primary created room.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isLoading}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
