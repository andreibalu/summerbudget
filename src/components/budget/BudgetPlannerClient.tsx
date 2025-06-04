
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { initialBudgetData, MONTHS } from "@/lib/types";
import type { BudgetData, MonthKey, Transaction, MonthData } from "@/lib/types";
import { MonthView } from "./MonthView";
import { db } from "@/lib/firebase";
import { ref as dbRef, onValue, set as firebaseSet, off, get } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { User } from "firebase/auth"; // Import User type

interface BudgetPlannerClientProps {
  currentRoomId: string | null;
  user: User; // Add user prop
}

export interface CarryOverDetails {
  amount: number;
  previousMonthName: MonthKey | null;
}

export function BudgetPlannerClient({ currentRoomId, user }: BudgetPlannerClientProps) {
  const [budgetData, setBudgetData] = useState<BudgetData>(initialBudgetData);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState<MonthKey>(MONTHS[0]);
  const [carryOverDetails, setCarryOverDetails] = useState<CarryOverDetails>({ amount: 0, previousMonthName: null });

  // Determine the Firebase path based on whether currentRoomId or user.uid is used
  const getFirebaseDataPath = useCallback(() => {
    if (currentRoomId) {
      return `rooms/${currentRoomId}/budgetData`;
    }
    if (user?.uid) {
      return `users/${user.uid}/personalBudget`;
    }
    return null;
  }, [currentRoomId, user]);


  useEffect(() => {
    if (!db || !user?.uid) { // Ensure db and user.uid are available
      if (user?.uid && !db) {
        toast({ variant: "destructive", title: "Database Error", description: "Realtime Database not connected. Sync disabled." });
      }
      return;
    }

    const dataPath = getFirebaseDataPath();
    if (!dataPath) return;

    const dataRef = dbRef(db, dataPath);
    setIsDataLoaded(false); // Reset loading state for new path

    const listener = onValue(dataRef, (snapshot) => {
      let dataToSet: BudgetData;
      if (snapshot.exists()) {
        const dataFromDB = snapshot.val();
        // Ensure data structure is complete
        dataToSet = MONTHS.reduce((acc, month) => {
          acc[month] = dataFromDB[month] || { ...initialBudgetData[month] };
          acc[month].incomes = acc[month].incomes ? Object.values(dataFromDB[month]?.incomes || {}) : [];
          acc[month].spendings = acc[month].spendings ? Object.values(dataFromDB[month]?.spendings || {}) : [];
          acc[month].financialGoal = dataFromDB[month]?.financialGoal || "";
          return acc;
        }, {} as BudgetData);

        if (!isDataLoaded) { // Show toast only on initial load or path change
          toast({ title: "Data Synced", description: currentRoomId ? `Budget loaded from room ${currentRoomId}.` : "Personal budget loaded." });
        }
      } else {
        // Data doesn't exist, initialize it
        dataToSet = JSON.parse(JSON.stringify(initialBudgetData));
        firebaseSet(dataRef, dataToSet)
          .then(() => {
            toast({ title: currentRoomId ? "Room Initialized" : "Personal Budget Initialized", description: currentRoomId ? `New room ${currentRoomId} created.` : "Your personal budget area is ready." });
          })
          .catch(error => {
            console.error("Failed to initialize data in Firebase:", error);
            toast({ variant: "destructive", title: "Initialization Error", description: "Could not create budget in cloud." });
          });
      }
      setBudgetData(dataToSet);
      setIsDataLoaded(true);
    }, (error) => {
      console.error("Firebase onValue error:", error);
      toast({ variant: "destructive", title: "Sync Error", description: "Could not fetch data from cloud." });
      setIsDataLoaded(true); // Set to true to prevent continuous loading state on error
    });

    return () => {
      off(dataRef, "value", listener);
      setIsDataLoaded(false); // Reset on unmount or path change
    };
  }, [currentRoomId, user, toast, getFirebaseDataPath, isDataLoaded]); // Added isDataLoaded to deps for initial toast


  // Effect to save data to Firebase when budgetData changes
  useEffect(() => {
    if (!db || !user?.uid || !isDataLoaded || !budgetData) return; // Don't save if not loaded or no data

    const dataPath = getFirebaseDataPath();
    if (!dataPath) return;

    const dataRef = dbRef(db, dataPath);
    firebaseSet(dataRef, budgetData).catch(error => {
      console.error("Failed to sync data to Firebase:", error);
      toast({ variant: "destructive", title: "Sync Error", description: "Could not save changes to the cloud." });
    });
  }, [budgetData, user, db, toast, isDataLoaded, getFirebaseDataPath]);


  const calculateIntrinsicMonthBalance = useCallback((monthData: MonthData | undefined): number => {
    if (!monthData) return 0;
    const totalIncome = (monthData.incomes || []).reduce((sum, item) => sum + item.amount, 0);
    const totalSpendings = (monthData.spendings || []).reduce((sum, item) => sum + item.amount, 0);
    return totalIncome - totalSpendings;
  }, []);

  const calculateAccumulatedSurplusBeforeMonth = useCallback((targetMonthKey: MonthKey, currentBudgetData: BudgetData): number => {
    let cumulativeSurplus = 0;
    const targetMonthIndex = MONTHS.indexOf(targetMonthKey);

    if (targetMonthIndex === -1) return 0; 

    for (let i = 0; i < targetMonthIndex; i++) { 
        const month = MONTHS[i];
        const monthData = currentBudgetData[month];
        const intrinsicBalanceThisMonth = calculateIntrinsicMonthBalance(monthData);
        
        cumulativeSurplus += intrinsicBalanceThisMonth;
        
        if (cumulativeSurplus < 0) {
            cumulativeSurplus = 0;
        }
    }
    return cumulativeSurplus; 
  }, [calculateIntrinsicMonthBalance]);

  useEffect(() => {
    if (!budgetData || !user?.uid) return;

    const currentMonthIndex = MONTHS.indexOf(activeMonth);
    if (currentMonthIndex > 0) {
        const previousMonthKey = MONTHS[currentMonthIndex - 1];
        const accumulatedAmount = calculateAccumulatedSurplusBeforeMonth(activeMonth, budgetData);
        
        setCarryOverDetails({
            amount: accumulatedAmount, 
            previousMonthName: previousMonthKey,
        });
    } else {
        setCarryOverDetails({ amount: 0, previousMonthName: null }); 
    }
  }, [activeMonth, budgetData, user, calculateAccumulatedSurplusBeforeMonth]);


  const handleAddTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    transaction: Omit<Transaction, "id">
  ) => {
    setBudgetData((prevData) => {
      const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
      const currentMonthData = prevData[month] ? { ...prevData[month] } : { incomes: [], spendings: [], financialGoal: "" };
      
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
      const currentMonthData = prevData[month] ? { ...prevData[month] } : { incomes: [], spendings: [], financialGoal: "" };
      if (type === "income") {
        currentMonthData.incomes = (currentMonthData.incomes || []).filter((t) => t.id !== id);
      } else {
        currentMonthData.spendings = (currentMonthData.spendings || []).filter((t) => t.id !== id);
      }
      return { ...prevData, [month]: currentMonthData };
    });
  };

  const handleFinancialGoalChange = (month: MonthKey, goal: string) => {
    setBudgetData((prevData) => {
      const currentMonthData = prevData[month] ? { ...prevData[month] } : { incomes: [], spendings: [], financialGoal: "" };
      currentMonthData.financialGoal = goal;
      return { ...prevData, [month]: currentMonthData };
    });
  };
  
  if (!user?.uid) { // Show loading or placeholder if user is not available yet
    return <div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /> <p className="mt-2">Loading budget data...</p></div>; 
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
        key={activeMonth} 
        monthKey={activeMonth}
        data={budgetData[activeMonth] || { incomes: [], spendings: [], financialGoal: "" }} 
        onAddTransaction={handleAddTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onFinancialGoalChange={handleFinancialGoalChange}
        carryOverDetails={carryOverDetails}
      />
    </div>
  );
}
