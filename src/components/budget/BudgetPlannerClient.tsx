
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { initialBudgetData, MONTHS, USER_ID_STORAGE_KEY, BUDGET_DATA_STORAGE_KEY_PREFIX } from "@/lib/types";
import type { BudgetData, MonthKey, Transaction } from "@/lib/types";
import { MonthView } from "./MonthView";
import { db } from "@/lib/firebase"; // Firebase RTDB
import { ref as dbRef, onValue, set as firebaseSet, off } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BudgetPlannerClientProps {
  currentRoomId: string | null;
}

export function BudgetPlannerClient({ currentRoomId }: BudgetPlannerClientProps) {
  const [budgetData, setBudgetData] = useState<BudgetData>(initialBudgetData);
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isDataLoadedFromDB, setIsDataLoadedFromDB] = useState(false);
  const [activeMonth, setActiveMonth] = useState<MonthKey>(MONTHS[0]);

  useEffect(() => {
    setIsClient(true);
    let id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_STORAGE_KEY, id);
    }
    setUserId(id);
  }, []);

  const getPersonalStorageKey = useCallback(() => {
    if (userId) {
      return `${BUDGET_DATA_STORAGE_KEY_PREFIX}_user_${userId}`;
    }
    return null;
  }, [userId]);

  // Effect for Firebase RTDB connection and data loading/syncing
  useEffect(() => {
    if (!isClient || !db) {
      if (isClient && currentRoomId && !db) {
         toast({ variant: "destructive", title: "Database Error", description: "Realtime Database not connected. Sync disabled." });
      }
      return;
    }

    if (currentRoomId) {
      setIsDataLoadedFromDB(false); // Reset for new room
      const roomBudgetDataRef = dbRef(db, `rooms/${currentRoomId}/budgetData`);
      const unsubscribe = onValue(roomBudgetDataRef, (snapshot) => {
        if (snapshot.exists()) {
          const dataFromDB = snapshot.val();
          const completeData = MONTHS.reduce((acc, month) => {
            acc[month] = dataFromDB[month] || initialBudgetData[month];
            acc[month].incomes = acc[month].incomes || [];
            acc[month].spendings = acc[month].spendings || [];
            return acc;
          }, {} as BudgetData);
          setBudgetData(completeData);
          if (!isDataLoadedFromDB) { 
             toast({ title: "Data Synced", description: `Budget data loaded from room ${currentRoomId}.` });
          }
        } else {
          setBudgetData(initialBudgetData); 
          firebaseSet(roomBudgetDataRef, initialBudgetData)
            .then(() => {
               toast({ title: "Room Initialized", description: `New room ${currentRoomId} created in the cloud.` });
            })
            .catch(error => {
              console.error("Failed to initialize room in Firebase:", error);
              toast({ variant: "destructive", title: "Initialization Error", description: "Could not create room in cloud." });
            });
        }
        setIsDataLoadedFromDB(true);
      }, (error) => {
        console.error("Firebase onValue error:", error);
        toast({ variant: "destructive", title: "Sync Error", description: "Could not fetch data from cloud." });
        setIsDataLoadedFromDB(true); 
      });

      return () => {
        off(roomBudgetDataRef, "value", unsubscribe);
        setIsDataLoadedFromDB(false);
      };
    } else {
      // Personal mode: Load from localStorage
      setIsDataLoadedFromDB(false); 
      const personalKey = getPersonalStorageKey();
      if (personalKey) {
        const savedData = localStorage.getItem(personalKey);
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            const completeData = MONTHS.reduce((acc, month) => {
              acc[month] = parsedData[month] || initialBudgetData[month];
              acc[month].incomes = acc[month].incomes || [];
              acc[month].spendings = acc[month].spendings || [];
              return acc;
            }, {} as BudgetData);
            setBudgetData(completeData);
          } catch (error) {
            console.error("Failed to parse personal budget data:", error);
            localStorage.removeItem(personalKey);
            setBudgetData(initialBudgetData);
          }
        } else {
          setBudgetData(initialBudgetData);
        }
      } else {
        setBudgetData(initialBudgetData);
      }
    }
  }, [isClient, currentRoomId, userId, toast, getPersonalStorageKey]);


  // Effect to save budget data (to RTDB for rooms, to localStorage for personal)
  useEffect(() => {
    if (!isClient) return;

    // Debounce or selective save might be needed for high-frequency updates
    // For now, simple save on budgetData change if conditions are met
    if (currentRoomId && db && isDataLoadedFromDB) {
      const roomBudgetDataRef = dbRef(db, `rooms/${currentRoomId}/budgetData`);
      firebaseSet(roomBudgetDataRef, budgetData).catch(error => {
        console.error("Failed to sync data to Firebase:", error);
        toast({ variant: "destructive", title: "Sync Error", description: "Could not save changes to the cloud." });
      });
    } else if (!currentRoomId && userId) {
      // Personal mode: save to localStorage
      const personalKey = getPersonalStorageKey();
      if (personalKey) {
        localStorage.setItem(personalKey, JSON.stringify(budgetData));
      }
    }
  }, [budgetData, isClient, currentRoomId, userId, db, toast, isDataLoadedFromDB, getPersonalStorageKey]);


  const handleAddTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    transaction: Omit<Transaction, "id">
  ) => {
    setBudgetData((prevData) => {
      const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
      const currentMonthData = prevData[month] || { incomes: [], spendings: [] , financialGoal: ''};
      const updatedMonthData = { ...currentMonthData }; 
      
      if (type === "income") {
        updatedMonthData.incomes = [...updatedMonthData.incomes, newTransaction];
      } else {
        updatedMonthData.spendings = [...updatedMonthData.spendings, newTransaction];
      }
      return { ...prevData, [month]: updatedMonthData };
    });
  };

  const handleDeleteTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    id: string
  ) => {
    setBudgetData((prevData) => {
      const currentMonthData = prevData[month] || { incomes: [], spendings: [], financialGoal: '' };
      const updatedMonthData = { ...currentMonthData }; 
      if (type === "income") {
        updatedMonthData.incomes = updatedMonthData.incomes.filter((t) => t.id !== id);
      } else {
        updatedMonthData.spendings = updatedMonthData.spendings.filter((t) => t.id !== id);
      }
      return { ...prevData, [month]: updatedMonthData };
    });
  };
  
  if (!isClient) {
    return null; 
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex justify-center">
        <div className="w-full md:w-auto">
           <Label htmlFor="month-selector" className="sr-only">Select Month</Label>
           <Select
            value={activeMonth}
            onValueChange={(value) => setActiveMonth(value as MonthKey)}
          >
            <SelectTrigger id="month-selector" className="w-full md:w-[200px] text-base py-2.5">
              <SelectValue placeholder="Select month..." />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month} className="text-base py-2">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MonthView
        key={activeMonth}
        monthKey={activeMonth}
        data={budgetData[activeMonth] || initialBudgetData[activeMonth]} 
        onAddTransaction={handleAddTransaction}
        onDeleteTransaction={handleDeleteTransaction}
      />
    </div>
  );
}

