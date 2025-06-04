
export interface Transaction {
  id: string;
  description: string;
  amount: number;
}

export interface MonthData {
  incomes: Transaction[];
  spendings: Transaction[];
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

// Ensure initialBudgetData has empty arrays for incomes and spendings
export const initialBudgetData: BudgetData = MONTHS.reduce((acc, month) => {
  acc[month] = {
    incomes: [],
    spendings: [],
  };
  return acc;
}, {} as BudgetData);


// Constants for localStorage keys
export const USER_ID_STORAGE_KEY = "summerSproutUserId"; // For personal mode fallback
export const BUDGET_DATA_STORAGE_KEY_PREFIX = "summerSproutBudgetData"; // For personal mode
export const ACTIVE_ROOM_ID_STORAGE_KEY = "summerSproutActiveRoomId"; // To remember active room
