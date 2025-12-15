import type { Budget, BudgetStatus, Transaction } from '../types';

/**
 * Calculate budget status for a specific budget based on transactions
 */
export function calculateBudgetStatus(
  budget: Budget,
  transactions: Transaction[],
  month: Date
): BudgetStatus {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  // Filter transactions for this category in the current month
  const categoryTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return (
      tx.category === budget.category &&
      txDate >= monthStart &&
      txDate <= monthEnd &&
      tx.amount > 0 // Only count charges, not credits
    );
  });

  // Calculate total spent
  const spent = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = budget.monthlyLimit - spent;
  const percentage = (spent / budget.monthlyLimit) * 100;
  const isOverBudget = spent > budget.monthlyLimit;
  const isNearLimit = percentage >= budget.alertThreshold;

  return {
    budget,
    spent,
    remaining,
    percentage,
    isOverBudget,
    isNearLimit,
  };
}

/**
 * Calculate budget statuses for all budgets
 */
export function calculateAllBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  month: Date
): BudgetStatus[] {
  return budgets.map((budget) => calculateBudgetStatus(budget, transactions, month));
}
