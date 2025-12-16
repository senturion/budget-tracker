import type { Transaction } from '../types';
import { TransactionType, IncomeClass } from '../types';

export interface FinancialSummary {
  // Income breakdown
  income: {
    earned: number;      // Salary, wages
    passive: number;     // Interest, dividends, cashback
    reimbursement: number; // Refunds, returns
    windfall: number;    // Gifts, settlements
    total: number;       // All income
  };

  // Expense breakdown
  expenses: {
    total: number;
    byCategory: Map<string, number>;
    count: number;
  };

  // Transfers (net-zero, just movement)
  transfers: {
    total: number;
    count: number;
  };

  // Adjustments (corrections)
  adjustments: {
    total: number;
    count: number;
  };

  // Net worth impact
  netWorthChange: number; // income.total - expenses.total (excludes transfers & adjustments)

  // Cash flow (what actually moved)
  cashFlow: number; // All INFLOW + EXPENSE + TRANSFER
}

/**
 * Calculate comprehensive financial summary for a period
 */
export function calculateFinancialSummary(transactions: Transaction[]): FinancialSummary {
  const summary: FinancialSummary = {
    income: {
      earned: 0,
      passive: 0,
      reimbursement: 0,
      windfall: 0,
      total: 0,
    },
    expenses: {
      total: 0,
      byCategory: new Map(),
      count: 0,
    },
    transfers: {
      total: 0,
      count: 0,
    },
    adjustments: {
      total: 0,
      count: 0,
    },
    netWorthChange: 0,
    cashFlow: 0,
  };

  transactions.forEach((tx) => {
    if (!tx.type) {
      console.warn('Transaction missing type:', tx);
      return;
    }

    switch (tx.type) {
      case TransactionType.INFLOW:
        // Categorize income by class
        if (tx.affectsBudget) {
          summary.income.total += tx.amount;

          switch (tx.incomeClass) {
            case IncomeClass.EARNED:
              summary.income.earned += tx.amount;
              break;
            case IncomeClass.PASSIVE:
              summary.income.passive += tx.amount;
              break;
            case IncomeClass.REIMBURSEMENT:
              summary.income.reimbursement += tx.amount;
              break;
            case IncomeClass.WINDFALL:
              summary.income.windfall += tx.amount;
              break;
            default:
              // Default to earned if not specified
              summary.income.earned += tx.amount;
          }
        }
        break;

      case TransactionType.EXPENSE:
        // Only count expenses that affect budget
        if (tx.affectsBudget) {
          summary.expenses.total += tx.amount;
          summary.expenses.count++;

          if (tx.category) {
            const current = summary.expenses.byCategory.get(tx.category) || 0;
            summary.expenses.byCategory.set(tx.category, current + tx.amount);
          }
        }
        break;

      case TransactionType.TRANSFER:
        // Transfers are net-zero, just track volume
        summary.transfers.total += tx.amount;
        summary.transfers.count++;
        break;

      case TransactionType.ADJUSTMENT:
        // Adjustments are corrections, track but don't affect net worth
        summary.adjustments.total += tx.amount;
        summary.adjustments.count++;
        break;
    }
  });

  // Calculate net worth change (income - expenses)
  summary.netWorthChange = summary.income.total - summary.expenses.total;

  // Calculate total cash flow
  summary.cashFlow = summary.income.total + summary.expenses.total + summary.transfers.total;

  return summary;
}

/**
 * Get income sources breakdown
 */
export function getIncomeSources(transactions: Transaction[]): Array<{
  source: string;
  amount: number;
  percentage: number;
}> {
  const summary = calculateFinancialSummary(transactions);
  const total = summary.income.total;

  if (total === 0) return [];

  return [
    { source: 'Earned Income', amount: summary.income.earned, percentage: (summary.income.earned / total) * 100 },
    { source: 'Passive Income', amount: summary.income.passive, percentage: (summary.income.passive / total) * 100 },
    { source: 'Reimbursements', amount: summary.income.reimbursement, percentage: (summary.income.reimbursement / total) * 100 },
    { source: 'Windfalls', amount: summary.income.windfall, percentage: (summary.income.windfall / total) * 100 },
  ].filter(item => item.amount > 0);
}

/**
 * Get expense categories breakdown
 */
export function getExpenseCategories(transactions: Transaction[]): Array<{
  category: string;
  amount: number;
  percentage: number;
  count: number;
}> {
  const summary = calculateFinancialSummary(transactions);
  const total = summary.expenses.total;

  if (total === 0) return [];

  return Array.from(summary.expenses.byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
      count: transactions.filter(tx =>
        tx.type === TransactionType.EXPENSE &&
        tx.category === category &&
        tx.affectsBudget
      ).length,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate savings rate
 */
export function calculateSavingsRate(transactions: Transaction[]): number {
  const summary = calculateFinancialSummary(transactions);

  if (summary.income.total === 0) return 0;

  // Savings = Income - Expenses
  const savings = summary.netWorthChange;

  return (savings / summary.income.total) * 100;
}
