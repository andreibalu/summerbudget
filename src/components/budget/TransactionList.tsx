
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/types";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  type: "income" | "spending";
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, type, onDelete }: TransactionListProps) {
  const Icon = type === "income" ? ArrowDownCircle : ArrowUpCircle;
  const title = type === "income" ? "Incomes" : "Spendings";

  if (transactions.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-headline">
            <Icon className="mr-2 h-5 w-5 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No {type}s recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Icon className="mr-2 h-6 w-6 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-background/50 rounded-md border"
            >
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className={`text-sm ${type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {type === "income" ? "+" : "-"} {transaction.amount.toFixed(2)} RON
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(transaction.id)}
                aria-label={`Delete ${transaction.description}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
