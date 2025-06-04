
export interface Transaction {
  id: string;
  description: string;
  amount: number;
}

export interface MonthData {
  incomes: Transaction[];
  spendings: Transaction[];
  financialGoal: string; // Added for AI suggestions
}

export type MonthKey = 'June' | 'July' | 'August' | 'September';

export const MONTHS: MonthKey[] = ['June', 'July', 'August', 'September'];

export type BudgetData = {
  [key in MonthKey]: MonthData;
};

// Ensure initialBudgetData has empty arrays for incomes and spendings, and empty financialGoal
export const initialBudgetData: BudgetData = MONTHS.reduce((acc, month) => {
  acc[month] = {
    incomes: [],
    spendings: [],
    financialGoal: "",
  };
  return acc;
}, {} as BudgetData);


// Constants for localStorage keys
// USER_ID_STORAGE_KEY is no longer needed for budget data as it's tied to auth.uid
// BUDGET_DATA_STORAGE_KEY_PREFIX is no longer needed for budget data
// ACTIVE_ROOM_ID_STORAGE_KEY is no longer used.
