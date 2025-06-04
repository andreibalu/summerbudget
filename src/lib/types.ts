export interface Transaction {
  id: string;
  description: string;
  amount: number;
}

export interface MonthData {
  incomes: Transaction[];
  spendings: Transaction[];
  financialGoal: string;
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
    financialGoal: 'Save money and make the most of summer!',
  };
  return acc;
}, {} as BudgetData);
