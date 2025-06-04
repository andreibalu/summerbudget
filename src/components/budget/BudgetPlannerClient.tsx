
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialBudgetData, MONTHS } from "@/lib/types";
import type { BudgetData, MonthKey, Transaction } from "@/lib/types";
import { MonthView } from "./MonthView";

const USER_ID_STORAGE_KEY = "summerSproutUserId"; // For personal mode fallback
const BUDGET_DATA_STORAGE_KEY_PREFIX = "summerSproutBudgetData";

interface BudgetPlannerClientProps {
  currentRoomId: string | null;
}

export function BudgetPlannerClient({ currentRoomId }: BudgetPlannerClientProps) {
  const [budgetData, setBudgetData] = useState<BudgetData>(initialBudgetData);
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); // For personal mode

  // Effect to set client status and load user ID for personal mode
  useEffect(() => {
    setIsClient(true);
    let id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_STORAGE_KEY, id);
    }
    setUserId(id);
  }, []);

  const getStorageKey = useCallback(() => {
    if (currentRoomId) {
      return `${BUDGET_DATA_STORAGE_KEY_PREFIX}_room_${currentRoomId}`;
    }
    if (userId) { // Fallback to personal user-specific key if no room and userId is available
      return `${BUDGET_DATA_STORAGE_KEY_PREFIX}_user_${userId}`;
    }
    return null; // Should not happen if userId is set correctly
  }, [currentRoomId, userId]);

  // Effect to load budget data when component mounts or room/user ID changes
  useEffect(() => {
    if (!isClient || !userId) return; // Ensure userId is loaded for personal mode key generation

    const storageKey = getStorageKey();
    if (!storageKey) {
      // This case might happen if userId isn't set yet, or if we decide to not have a personal fallback
      // For now, if no room and no userId, it defaults to initialBudgetData
      setBudgetData(initialBudgetData);
      return;
    }
    
    const savedData = localStorage.getItem(storageKey);
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
        console.error(`Failed to parse budget data from localStorage (key: ${storageKey})`, error);
        localStorage.removeItem(storageKey);
        setBudgetData(initialBudgetData);
      }
    } else {
      // If no data for this key (new room or new user), initialize with default
      setBudgetData(initialBudgetData);
    }
  }, [isClient, userId, currentRoomId, getStorageKey]);


  // Effect to save budget data whenever it changes or room/user ID changes
  useEffect(() => {
    if (!isClient || !userId) return;

    const storageKey = getStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(budgetData));
    }
  }, [budgetData, isClient, userId, getStorageKey]);


  const handleAddTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    transaction: Omit<Transaction, "id">
  ) => {
    setBudgetData((prevData) => {
      const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
      const currentMonthData = prevData[month] || { incomes: [], spendings: [] }; // Ensure month data exists
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
      const currentMonthData = prevData[month] || { incomes: [], spendings: [] };
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
    // Render nothing or a loading indicator until client-side checks are complete
    // This matches the behavior in page.tsx
    return null; 
  }


  return (
    <Tabs defaultValue={MONTHS[0]} className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
        {MONTHS.map((month) => (
          <TabsTrigger key={month} value={month} className="text-sm md:text-base">
            {month}
          </TabsTrigger>
        ))}
      </TabsList>
      {MONTHS.map((month) => (
        <TabsContent key={month} value={month}>
          <MonthView
            monthKey={month}
            data={budgetData[month] || initialBudgetData[month]} 
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
