
"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialBudgetData, MONTHS } from "@/lib/types";
import type { BudgetData, MonthKey, Transaction } from "@/lib/types";
import { MonthView } from "./MonthView";

const USER_ID_STORAGE_KEY = "summerSproutUserId";
const BUDGET_DATA_STORAGE_KEY_BASE = "summerSproutBudgetData";

export function BudgetPlannerClient() {
  const [budgetData, setBudgetData] = useState<BudgetData>(initialBudgetData);
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);

    let currentUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!currentUserId) {
      currentUserId = crypto.randomUUID();
      localStorage.setItem(USER_ID_STORAGE_KEY, currentUserId);
    }
    setUserId(currentUserId);

    if (currentUserId) {
      const budgetStorageKey = `${BUDGET_DATA_STORAGE_KEY_BASE}_${currentUserId}`;
      const savedData = localStorage.getItem(budgetStorageKey);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          // Ensure all months are present, merging with initialBudgetData if necessary
          const completeData = MONTHS.reduce((acc, month) => {
            acc[month] = parsedData[month] || initialBudgetData[month];
            // Ensure incomes and spendings arrays exist
            acc[month].incomes = acc[month].incomes || [];
            acc[month].spendings = acc[month].spendings || [];
            return acc;
          }, {} as BudgetData);
          setBudgetData(completeData);
        } catch (error) {
          console.error("Failed to parse budget data from localStorage", error);
          localStorage.removeItem(budgetStorageKey); // Clear corrupted data
          setBudgetData(initialBudgetData); // Reset to initial data
        }
      } else {
        setBudgetData(initialBudgetData); // Initialize if no data for this user
      }
    }
  }, []);

  useEffect(() => {
    if (isClient && userId) {
      const budgetStorageKey = `${BUDGET_DATA_STORAGE_KEY_BASE}_${userId}`;
      localStorage.setItem(budgetStorageKey, JSON.stringify(budgetData));
    }
  }, [budgetData, userId, isClient]);


  const handleAddTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    transaction: Omit<Transaction, "id">
  ) => {
    setBudgetData((prevData) => {
      const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
      const updatedMonthData = { ...(prevData[month] || initialBudgetData[month]) }; 
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
      const updatedMonthData = { ...(prevData[month] || initialBudgetData[month]) }; 
      if (type === "income") {
        updatedMonthData.incomes = updatedMonthData.incomes.filter((t) => t.id !== id);
      } else {
        updatedMonthData.spendings = updatedMonthData.spendings.filter((t) => t.id !== id);
      }
      return { ...prevData, [month]: updatedMonthData };
    });
  };
  
  if (!isClient || !userId) {
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
