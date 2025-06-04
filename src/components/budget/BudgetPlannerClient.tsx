"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialBudgetData, MONTHS } from "@/lib/types";
import type { BudgetData, MonthKey, Transaction } from "@/lib/types";
import { MonthView } from "./MonthView";

export function BudgetPlannerClient() {
  const [budgetData, setBudgetData] = useState<BudgetData>(initialBudgetData);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load data from localStorage if available
    const savedData = localStorage.getItem("summerSproutBudgetData");
    if (savedData) {
      try {
        setBudgetData(JSON.parse(savedData));
      } catch (error) {
        console.error("Failed to parse budget data from localStorage", error);
        localStorage.removeItem("summerSproutBudgetData"); // Clear corrupted data
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      // Save data to localStorage whenever it changes
      localStorage.setItem("summerSproutBudgetData", JSON.stringify(budgetData));
    }
  }, [budgetData, isClient]);


  const handleAddTransaction = (
    month: MonthKey,
    type: "income" | "spending",
    transaction: Omit<Transaction, "id">
  ) => {
    setBudgetData((prevData) => {
      const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
      const updatedMonthData = { ...prevData[month] };
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
      const updatedMonthData = { ...prevData[month] };
      if (type === "income") {
        updatedMonthData.incomes = updatedMonthData.incomes.filter((t) => t.id !== id);
      } else {
        updatedMonthData.spendings = updatedMonthData.spendings.filter((t) => t.id !== id);
      }
      return { ...prevData, [month]: updatedMonthData };
    });
  };
  
  const handleUpdateFinancialGoal = (month: MonthKey, goal: string) => {
    setBudgetData((prevData) => ({
      ...prevData,
      [month]: {
        ...prevData[month],
        financialGoal: goal,
      },
    }));
  };

  if (!isClient) {
    // Render nothing or a loading indicator on the server or before hydration
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
            data={budgetData[month]}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateFinancialGoal={handleUpdateFinancialGoal}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
