export interface Account {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'chequing' | 'savings' | 'other';
  institution?: string;
  color: string; // hex color for visual identification
  isDefault: boolean;
  createdAt: string;
}

// Transaction types: distinguish money movement from economic impact
export enum TransactionType {
  INFLOW = 'INFLOW',       // increases net worth
  EXPENSE = 'EXPENSE',     // decreases net worth
  TRANSFER = 'TRANSFER',   // moves money between user accounts, net-zero
  ADJUSTMENT = 'ADJUSTMENT' // reconciliation or correction
}

// Income classification for INFLOW transactions
export enum IncomeClass {
  EARNED = 'EARNED',             // salary, wages
  PASSIVE = 'PASSIVE',           // interest, dividends, cashback
  REIMBURSEMENT = 'REIMBURSEMENT', // refunds, insurance reimbursements
  WINDFALL = 'WINDFALL',         // gifts, settlements
  ADJUSTMENT = 'ADJUSTMENT'       // corrections
}

export interface Transaction {
  id: string;

  // Core transaction type - REQUIRED
  type: TransactionType;

  // Account references
  accountId: string; // primary account (or "from" account for transfers)
  toAccountId?: string; // only for TRANSFER type

  // Transaction details
  date: string; // ISO date
  description: string;
  merchant: string; // cleaned/normalized merchant name
  amount: number; // always positive, represents magnitude

  // Categorization (ONLY for EXPENSE and INFLOW)
  category: string | null; // null for TRANSFER and ADJUSTMENT
  categorySource?: 'ai' | 'manual' | 'rule'; // only meaningful when category exists

  // Income classification (ONLY for INFLOW)
  incomeClass?: IncomeClass;

  // Linking and budget impact
  linkedTransactionId?: string; // for refunds/reimbursements tied to original expense
  affectsBudget: boolean; // false for TRANSFER and ADJUSTMENT

  // Metadata
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

// Expense categories
export const EXPENSE_CATEGORIES = [
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
  'Fees & Interest',
  'Other',
];

// Income categories
export const INCOME_CATEGORIES = [
  'Income: Salary',
  'Income: Freelance',
  'Income: Bonus',
  'Investment Income',
  'Interest',
  'Cashback',
  'Insurance Payout',
  'Gift',
  'Other Income',
];

// All categories (for backward compatibility)
export const DEFAULT_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];
