
"use client";

import React, { useState, useEffect } from 'react';
import { BudgetPlannerClient } from '@/components/budget/BudgetPlannerClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf } from 'lucide-react'; // Using Leaf as a thematic icon

export default function BudgetPlannerPage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center font-body">
      <Card className="w-full max-w-5xl shadow-xl rounded-lg">
        <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
          <div className="flex items-center justify-center space-x-3">
            <Leaf className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl md:text-4xl font-headline text-center text-primary tracking-tight">
              Summer Sprout Budget
            </CardTitle>
            <Leaf className="h-10 w-10 text-primary transform scale-x-[-1]" />
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <BudgetPlannerClient />
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-muted-foreground text-sm">
        {currentYear !== null ? (
          <p>&copy; {currentYear} Summer Sprout Budget. Plan your best summer!</p>
        ) : (
          <p>Loading copyright year...</p> 
        )}
      </footer>
    </main>
  );
}
