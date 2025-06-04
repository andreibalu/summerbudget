
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { initialBudgetData, MONTHS, USER_ID_STORAGE_KEY, BUDGET_DATA_STORAGE_KEY_PREFIX } from "@/lib/types";
import type { BudgetData, MonthKey, Transaction, MonthData } from "@/lib/types";
import { MonthView } from "./MonthView";
import { db } from "@/lib/firebase"; // Firebase RTDB
import { ref as dbRef, onValue, set as firebaseSet, off } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BudgetPlannerClientProps {
  currentRoomId: string | null;
}

export interface CarryOverDetails {
  amount: number;
  previousMonthName: MonthKey | null;
}

export function BudgetPlannerClient({ currentRoomId }: BudgetPlannerClientProps) {
  const [budgetData, setBudgetData] = useState<BudgetData>(initialBudgetData);
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isDataLoadedFromDB, setIsDataLoadedFromDB] = useState(false);
  const [activeMonth, setActiveMonth] = useState<MonthKey>(MONTHS[0]);
  const [carryOverDetails, setCarryOverDetails] = useState<CarryOverDetails>({ amount: 0, previousMonthName: null });

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
    if (!isClient || (currentRoomId && !db)) {
      if (isClient && currentRoomId && !db) {
         toast({ variant: "destructive", title: "Database Error", description: "Realtime Database not connected. Sync disabled." });
      }
      return;
    }

    let unsubscribe: (() => void) | null = null;

    if (currentRoomId) {
      setIsDataLoadedFromDB(false);
      const roomBudgetDataRef = dbRef(db, `rooms/${currentRoomId}/budgetData`);
      const listener = onValue(roomBudgetDataRef, (snapshot) => {
        let dataToSet: BudgetData;
        if (snapshot.exists()) {
          const dataFromDB = snapshot.val();
          dataToSet = MONTHS.reduce((acc, month) => {
            acc[month] = dataFromDB[month] || { ...initialBudgetData[month] }; // Ensure fresh object for safety
            acc[month].incomes = acc[month].incomes ? [...acc[month].incomes] : [];
            acc[month].spendings = acc[month].spendings ? [...acc[month].spendings] : [];
            return acc;
          }, {} as BudgetData);
          if (!isDataLoadedFromDB) {
             toast({ title: "Data Synced", description: `Budget data loaded from room ${currentRoomId}.` });
          }
        } else {
          dataToSet = JSON.parse(JSON.stringify(initialBudgetData)); // Deep copy
          firebaseSet(roomBudgetDataRef, dataToSet)
            .then(() => {
               toast({ title: "Room Initialized", description: `New room ${currentRoomId} created in the cloud.` });
            })
            .catch(error => {
              console.error("Failed to initialize room in Firebase:", error);
              toast({ variant: "destructive", title: "Initialization Error", description: "Could not create room in cloud." });
            });
        }
        setBudgetData(dataToSet);
        setIsDataLoadedFromDB(true);
      }, (error) => {
        console.error("Firebase onValue error:", error);
        toast({ variant: "destructive", title: "Sync Error", description: "Could not fetch data from cloud." });
        setIsDataLoadedFromDB(true);
      });
      unsubscribe = () => off(roomBudgetDataRef, "value", listener);
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
              acc[month] = parsedData[month] || { ...initialBudgetData[month] };
              acc[month].incomes = acc[month].incomes ? [...acc[month].incomes] : [];
              acc[month].spendings = acc[month].spendings ? [...acc[month].spendings] : [];
              return acc;
            }, {} as BudgetData);
            setBudgetData(completeData);
          } catch (error) {
            console.error("Failed to parse personal budget data:", error);
            localStorage.removeItem(personalKey);
            setBudgetData(JSON.parse(JSON.stringify(initialBudgetData)));
          }
        } else {
          setBudgetData(JSON.parse(JSON.stringify(initialBudgetData)));
        }
      } else {
        setBudgetData(JSON.parse(JSON.stringify(initialBudgetData)));
      }
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      setIsDataLoadedFromDB(false);
    };
  }, [isClient, currentRoomId, userId, toast, getPersonalStorageKey]);


  // Effect to save budget data (to RTDB for rooms, to localStorage for personal)
  useEffect(() => {
    if (!isClient || !budgetData) return; // Ensure budgetData is initialized

    // Debounce or selective save might be needed for high-frequency updates
    if (currentRoomId && db && isDataLoadedFromDB) { // Only save if data loaded from DB
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


  const calculateMonthBalance = (monthData: MonthData): number => {
    const totalIncome = (monthData.incomes || []).reduce((sum, item) => sum + item.amount, 0);
    const totalSpendings = (monthData.spendings || []).reduce((sum, item) => sum + item.amount, 0);
    return totalIncome - totalSpendings;
  };

  useEffect(() => {
    if (!budgetData) return;

    const currentMonthIndex = MONTHS.indexOf(activeMonth);
    if (currentMonthIndex > 0) {
      const previousMonthKey = MONTHS[currentMonthIndex - 1];
      const previousMonthData = budgetData[previousMonthKey];
      if (previousMonthData) {
        const previousMonthBalance = calculateMonthBalance(previousMonthData);
        setCarryOverDetails({
          amount: previousMonthBalance > 0 ? previousMonthBalance : 0,
          previousMonthName: previousMonthKey,
        });
      } else {
        setCarryOverDetails({ amount: 0, previousMonthName: null });
      }
    } else {
      setCarryOverDetails({ amount: 0, previousMonthName: null }); // For June
    }
  }, [activeMonth, budgetData]);


  const handleAddTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    transaction: Omit<Transaction, "id">
  ) => {
    setBudgetData((prevData) => {
      const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
      const currentMonthData = prevData[month] ? { ...prevData[month] } : { incomes: [], spendings: []};
      
      if (type === "income") {
        currentMonthData.incomes = [...(currentMonthData.incomes || []), newTransaction];
      } else {
        currentMonthData.spendings = [...(currentMonthData.spendings || []), newTransaction];
      }
      return { ...prevData, [month]: currentMonthData };
    });
  };

  const handleDeleteTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    id: string
  ) => {
    setBudgetData((prevData) => {
      const currentMonthData = prevData[month] ? { ...prevData[month] } : { incomes: [], spendings: []};
      if (type === "income") {
        currentMonthData.incomes = (currentMonthData.incomes || []).filter((t) => t.id !== id);
      } else {
        currentMonthData.spendings = (currentMonthData.spendings || []).filter((t) => t.id !== id);
      }
      return { ...prevData, [month]: currentMonthData };
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
            <SelectTrigger id="month-selector" className="w-full md:w-[200px] text-sm sm:text-base py-2 sm:py-2.5">
              <SelectValue placeholder="Select month..." />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month} className="text-sm sm:text-base py-1.5 sm:py-2">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MonthView
        key={activeMonth} // Important to re-mount MonthView when month changes if it has internal state dependent on month
        monthKey={activeMonth}
        data={budgetData[activeMonth] || { incomes: [], spendings: [] }} 
        onAddTransaction={handleAddTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        carryOverDetails={carryOverDetails}
      />
    </div>
  );
}
