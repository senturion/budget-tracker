export interface Account {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'checking' | 'savings' | 'other';
  institution?: string;
  color: string; // hex color for visual identification
  isDefault: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO date
  description: string;
  merchant: string; // cleaned/normalized merchant name
  amount: number; // positive for charges, negative for credits
  category: string;
  categorySource: 'ai' | 'manual' | 'rule';
  importedAt: string;
  sourceFile: string;
}

export interface MerchantRule {
  pattern: string;
  category: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number; // percentage, e.g., 80
  accountId?: string; // optional - if set, budget applies to specific account only
  createdAt: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean; // true if over alert threshold
}

export interface AppSettings {
  apiKey: string;
  defaultCategories: string[];
  currency: string; // "CAD"
}

export interface SpendingSummary {
  totalSpending: number;
  totalPayments: number;
  netChange: number;
  categoryBreakdown: CategorySpending[];
  periodStart: string;
  periodEnd: string;
  previousPeriodChange?: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface CSVRow {
  date: string;
  description: string;
  charge: string;
  credit: string;
  balance: string;
}

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Coffee',
  'Restaurants & Dining',
  'Food Delivery',
  'Clothing & Apparel',
  'Kids & Family',
  'Entertainment',
  'Subscriptions & Recurring',
  'Transportation & Gas',
  'Home & Household',
  'Health & Pharmacy',
  'Pets',
  'Amazon',
  'Payments & Credits',
  'Fees & Interest',
  'Other',
];
