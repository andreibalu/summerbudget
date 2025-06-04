
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/types";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface BalanceDisplayProps {
  incomes: Transaction[];
  spendings: Transaction[];
  monthName: string;
}

export function BalanceDisplay({ incomes, spendings, monthName }: BalanceDisplayProps) {
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalSpendings = spendings.reduce((sum, item) => sum + item.amount, 0);
  const balance = totalIncome - totalSpendings;

  return (
    <Card className="my-6 shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center text-primary">
          Account Balance - {monthName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            <span className="font-medium">Total Income</span>
          </div>
          <span className="font-semibold text-green-600">{totalIncome.toFixed(2)} RON</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
          <div className="flex items-center">
            <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
            <span className="font-medium">Total Spendings</span>
          </div>
          <span className="font-semibold text-red-600">{totalSpendings.toFixed(2)} RON</span>
        </div>
        <div className={`flex justify-between items-center p-4 rounded-lg shadow-inner ${balance >= 0 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
          <div className="flex items-center">
            <Wallet className={`h-6 w-6 mr-2 ${balance >= 0 ? 'text-primary' : 'text-destructive'}`} />
            <span className="text-lg font-bold">Remaining Balance</span>
          </div>
          <span className={`text-xl font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {balance.toFixed(2)} RON
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
