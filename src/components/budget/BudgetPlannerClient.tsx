
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
import type { User } from "firebase/auth";
import { Loader2 } from "lucide-react";

interface BudgetPlannerClientProps {
  currentRoomId: string | null;
  user: User;
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
    if (!db || !user?.uid) {
      if (user?.uid && !db) {
        // toast({ variant: "destructive", title: "Database Error", description: "Realtime Database not connected. Sync disabled." });
      }
      setIsDataLoaded(true); 
      setBudgetData(initialBudgetData); 
      return;
    }

    const dataPath = getFirebaseDataPath();
    if (!dataPath) {
      setBudgetData(initialBudgetData);
      setIsDataLoaded(true);
      return;
    }
    
    const dataRef = dbRef(db, dataPath);
    setIsDataLoaded(false);

    const listener = onValue(dataRef, (snapshot) => {
      let dataToSet: BudgetData;
      if (snapshot.exists()) {
        const dataFromDB = snapshot.val();
        dataToSet = MONTHS.reduce((acc, month) => {
          acc[month] = dataFromDB[month] || { ...initialBudgetData[month] };
          acc[month].incomes = acc[month].incomes ? Object.values(dataFromDB[month]?.incomes || {}) : [];
          acc[month].spendings = acc[month].spendings ? Object.values(dataFromDB[month]?.spendings || {}) : [];
          acc[month].financialGoal = dataFromDB[month]?.financialGoal || "";
          return acc;
        }, {} as BudgetData);

      } else {
        dataToSet = JSON.parse(JSON.stringify(initialBudgetData));
        firebaseSet(dataRef, dataToSet)
          .catch(error => {
            console.error("Failed to initialize personal budget data in Firebase on first load:", error);
            // Removed toast: toast({ variant: "destructive", title: "Initialization Error", description: "Could not create budget in cloud." });
          });
      }
      setBudgetData(dataToSet);
      setIsDataLoaded(true);
    }, (error) => {
      const isRoomPath = dataPath?.startsWith('rooms/');
      const isPermissionDenied = (error as Error & { code?: string }).code === 'PERMISSION_DENIED';

      // Suppress console log and toast for PERMISSION_DENIED on a room path IF we are no longer in a room mode
      if (isPermissionDenied && isRoomPath && !currentRoomId) {
        // This is likely the scenario of leaving a room, listener fires one last time.
        // No console log or toast needed here.
        setIsDataLoaded(true); // Ensure UI isn't stuck loading
        setBudgetData(initialBudgetData); // Reset to avoid showing stale data
        return;
      }
      
      // Log other errors
      console.error(`Firebase onValue error for path: ${dataPath}`, error);

      const contextDescription = currentRoomId ? `room '${currentRoomId}'` : "personal budget";
      let errorDescription = `Could not load data for ${contextDescription}.`;
      if (isPermissionDenied) {
          errorDescription = `Permission denied for ${contextDescription}. Ensure you are a member or have access.`;
      }
      toast({ 
        variant: "destructive", 
        title: "Sync Error", 
        description: errorDescription
      });
      setBudgetData(initialBudgetData); 
      setIsDataLoaded(true); 
    });

    return () => {
      off(dataRef, "value", listener);
    };
  }, [currentRoomId, user, toast, getFirebaseDataPath]);


  useEffect(() => {
    if (!db || !user?.uid || !isDataLoaded || !budgetData || Object.keys(budgetData).length === 0) return; 

    const dataPath = getFirebaseDataPath();
    if (!dataPath) return;

    if (JSON.stringify(budgetData) === JSON.stringify(initialBudgetData)) {
        const dataRefForCheck = dbRef(db, dataPath);
        get(dataRefForCheck).then(snapshot => {
            if (!snapshot.exists()) {
                 firebaseSet(dbRef(db, dataPath), budgetData).catch(error => {
                    console.error("Failed to sync initial data to Firebase:", error);
                 });
            }
        });
        return; 
    }


    firebaseSet(dbRef(db, dataPath), budgetData).catch(error => {
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
    if (!budgetData || !user?.uid || Object.keys(budgetData).length === 0) {
        setCarryOverDetails({ amount: 0, previousMonthName: null }); 
        return;
    }

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
      const safePrevData = Object.keys(prevData || {}).length > 0 ? prevData : initialBudgetData;
      const currentMonthData = safePrevData[month] ? { ...safePrevData[month] } : { ...initialBudgetData[month] };
      
      if (type === "income") {
        currentMonthData.incomes = [...(currentMonthData.incomes || []), newTransaction];
      } else {
        currentMonthData.spendings = [...(currentMonthData.spendings || []), newTransaction];
      }
      return { ...safePrevData, [month]: currentMonthData };
    });
    toast({
        title: type === "income" ? "Income Added" : "Spending Added",
        description: `${transaction.description}: ${transaction.amount.toFixed(2)} RON`,
        duration: 2000,
    });
  };

  const handleDeleteTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    id: string
  ) => {
    setBudgetData((prevData) => {
      const safePrevData = Object.keys(prevData || {}).length > 0 ? prevData : initialBudgetData;
      const currentMonthData = safePrevData[month] ? { ...safePrevData[month] } : { ...initialBudgetData[month] };
      if (type === "income") {
        currentMonthData.incomes = (currentMonthData.incomes || []).filter((t) => t.id !== id);
      } else {
        currentMonthData.spendings = (currentMonthData.spendings || []).filter((t) => t.id !== id);
      }
      return { ...safePrevData, [month]: currentMonthData };
    });
  };

  const handleFinancialGoalChange = (month: MonthKey, goal: string) => {
    setBudgetData((prevData) => {
      const safePrevData = Object.keys(prevData || {}).length > 0 ? prevData : initialBudgetData;
      const currentMonthData = safePrevData[month] ? { ...safePrevData[month] } : { ...initialBudgetData[month] };
      currentMonthData.financialGoal = goal;
      return { ...safePrevData, [month]: currentMonthData };
    });
  };
  
  if (!user?.uid || !isDataLoaded) { 
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
        key={activeMonth + (currentRoomId || user.uid)}
        monthKey={activeMonth}
        data={budgetData[activeMonth] || { ...initialBudgetData[activeMonth] }} 
        onAddTransaction={handleAddTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onFinancialGoalChange={handleFinancialGoalChange}
        carryOverDetails={carryOverDetails}
        user={user}
      />
    </div>
  );
}

