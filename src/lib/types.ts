
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

// Room and Member Management Types
export interface RoomMember {
  userId: string;
  joinedAt: number;
  lastSeen: number;
  isActive: boolean;
}

export interface RoomMetadata {
  createdBy: string;
  createdAt: number;
  roomName: string;
  lastActivity: number;
}

export interface Room {
  meta: RoomMetadata;
  budgetData: BudgetData;
  members: { [userId: string]: boolean };
  activeMembers: { [userId: string]: RoomMember };
}

// Member presence tracking
export interface MemberPresence {
  userId: string;
  lastSeen: number;
  isOnline: boolean;
}

// Ensure initialBudgetData has empty arrays for incomes and spendings
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
