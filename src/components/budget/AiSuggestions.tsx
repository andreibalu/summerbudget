
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { MonthData } from "@/lib/types";
import { getSpendingRecommendations, type SpendingRecommendationsInput } from "@/ai/flows/spending-recommendations";
import { Lightbulb, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AiSuggestionsProps {
  monthData: MonthData;
  onFinancialGoalChange: (goal: string) => void;
}

export function AiSuggestions({ monthData, onFinancialGoalChange }: AiSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setRecommendations([]);

    const totalIncome = monthData.incomes.reduce((sum, item) => sum + item.amount, 0);
    const spendingsForAI = monthData.spendings.map(s => ({ category: s.description, amount: s.amount }));

    const aiInput: SpendingRecommendationsInput = {
      monthlyIncome: totalIncome,
      monthlySpendings: spendingsForAI,
      financialGoals: monthData.financialGoal,
    };

    try {
      const result = await getSpendingRecommendations(aiInput);
      setRecommendations(result.recommendations);
      // Success toast removed: toast({ title: "AI Suggestions Loaded", ... });
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch AI suggestions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Lightbulb className="mr-2 h-6 w-6 text-accent" /> AI Spending Advisor
        </CardTitle>
        <CardDescription>Get personalized tips to optimize your budget.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="financial-goal" className="text-sm font-medium">
            Your Financial Goal for this Month
          </Label>
          <Textarea
            id="financial-goal"
            value={monthData.financialGoal}
            onChange={(e) => onFinancialGoalChange(e.target.value)}
            placeholder="e.g., Save for a weekend trip, reduce dining out expenses"
            className="mt-1 min-h-[80px]"
          />
        </div>
        <Button onClick={handleGetSuggestions} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Getting Tips..." : "Get Smart Spending Tips"}
        </Button>

        {recommendations.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">Here are your personalized tips:</h4>
            <ul className="list-disc list-inside pl-2 space-y-1 text-sm">
              {recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
