
"use client";

import React from "react";
import type { MonthData, MonthKey, Transaction } from "@/lib/types";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { BalanceDisplay } from "./BalanceDisplay";
import { Card, CardContent } from "@/components/ui/card";
import type { CarryOverDetails } from "./BudgetPlannerClient";
interface MonthViewProps {
  monthKey: MonthKey;
  data: MonthData;
  onAddTransaction: (month: MonthKey, type: "income" | "spending", transaction: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (month: MonthKey, type: "income" | "spending", id: string) => void;
  carryOverDetails: CarryOverDetails;
}

export function MonthView({
  monthKey,
  data,
  onAddTransaction,
  onDeleteTransaction,
  carryOverDetails,
}: MonthViewProps) {
  
  const handleAddIncome = (income: Omit<Transaction, "id">) => {
    onAddTransaction(monthKey, "income", income);
  };

  const handleAddSpending = (spending: Omit<Transaction, "id">) => {
    onAddTransaction(monthKey, "spending", spending);
  };

  const handleDeleteIncome = (id: string) => {
    onDeleteTransaction(monthKey, "income", id);
  };

  const handleDeleteSpending = (id: string) => {
    onDeleteTransaction(monthKey, "spending", id);
  };

  return (
    <div className="space-y-6">
      <BalanceDisplay 
        incomes={data.incomes || []} 
        spendings={data.spendings || []} 
        monthName={monthKey}
        carryOverDetails={carryOverDetails}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Income */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4 font-headline">Add Income</h3>
              <TransactionForm type="income" onSubmit={handleAddIncome} />
            </CardContent>
          </Card>
          <TransactionList transactions={data.incomes || []} type="income" onDelete={handleDeleteIncome} />
        </div>

        {/* Right Column: Spending */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4 font-headline">Add Spending</h3>
              <TransactionForm type="spending" onSubmit={handleAddSpending} />
            </CardContent>
          </Card>
          <TransactionList transactions={data.spendings || []} type="spending" onDelete={handleDeleteSpending} />
        </div>
      </div>
    </div>
  );
}
