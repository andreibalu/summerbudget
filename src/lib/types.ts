
export interface Transaction {
  id: string;
  description: string;
  amount: number;
}

export interface MonthData {
  incomes: Transaction[];
  spendings: Transaction[];
  // financialGoal: string; // Removed as AI suggestions are gone
}

export type MonthKey = 'June' | 'July' | 'August' | 'September';

export const MONTHS: MonthKey[] = ['June', 'July', 'August', 'September'];

export type BudgetData = {
  [key in MonthKey]: MonthData;
};

export const initialTransaction: Omit<Transaction, 'id'> = {
  description: '',
  amount: 0,
};

export const initialBudgetData: BudgetData = MONTHS.reduce((acc, month) => {
  acc[month] = {
    incomes: [],
    spendings: [],
    // financialGoal: '', // Removed
  };
  return acc;
}, {} as BudgetData);


// Constants for localStorage keys
export const USER_ID_STORAGE_KEY = "summerSproutUserId";
export const BUDGET_DATA_STORAGE_KEY_PREFIX = "summerSproutBudgetData";
export const ACTIVE_ROOM_ID_STORAGE_KEY = "summerSproutActiveRoomId";
