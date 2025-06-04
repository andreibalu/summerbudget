"use client";

import type { ChangeEvent, FormEvent } from "react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Transaction } from "@/lib/types";
import { PlusCircle } from "lucide-react";

interface TransactionFormProps {
  type: "income" | "spending";
  onSubmit: (transaction: Omit<Transaction, "id">) => void;
}

export function TransactionForm({ type, onSubmit }: TransactionFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (description && !isNaN(numericAmount) && numericAmount > 0) {
      onSubmit({ description, amount: numericAmount });
      setDescription("");
      setAmount("");
    } else {
      // Basic validation feedback, ideally use react-hook-form for robust validation
      alert("Please enter a valid description and positive amount.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor={`${type}-description`} className="text-sm font-medium">
          Description
        </Label>
        <Input
          id={`${type}-description`}
          type="text"
          value={description}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          placeholder={type === "income" ? "e.g., Salary" : "e.g., Groceries"}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${type}-amount`} className="text-sm font-medium">
          Amount
        </Label>
        <Input
          id={`${type}-amount`}
          type="number"
          value={amount}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full" variant={type === 'income' ? 'default' : 'secondary'}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add {type === "income" ? "Income" : "Spending"}
      </Button>
    </form>
  );
}
