import type { Transaction, CategorySpending, SpendingSummary } from '../types';
import { TransactionType, IncomeClass } from '../types';
import { affectsSpending, affectsIncome } from './transactionValidation';

export function calculateSpendingSummary(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  previousPeriodTransactions?: Transaction[]
): SpendingSummary {
  // Calculate totals using new transaction type system
  let totalSpending = 0;
  let totalPayments = 0;

  let expenseCount = 0;
  let incomeCount = 0;
  let otherCount = 0;

  transactions.forEach((tx) => {
    // Skip transactions without type (shouldn't happen after migration)
    if (!tx.type) {
      console.warn('Transaction missing type field:', tx);
      return;
    }

    // Only count transactions that affect budget
    if (affectsSpending(tx)) {
      totalSpending += tx.amount;
      expenseCount++;
    } else if (affectsIncome(tx)) {
      // Only count EARNED and PASSIVE income as "payments"
      totalPayments += tx.amount;
      incomeCount++;
    } else {
      otherCount++;
    }
  });

  const netChange = totalSpending - totalPayments;

  console.log('Spending Summary:', {
    totalTransactions: transactions.length,
    expenses: { count: expenseCount, total: totalSpending },
    income: { count: incomeCount, total: totalPayments },
    other: { count: otherCount },
    netChange
  });

  // Calculate category breakdown - only expenses that affect budget
  const categoryMap = new Map<string, { amount: number; count: number }>();

  transactions
    .filter((tx) => affectsSpending(tx) && tx.category) // Only count spending transactions with categories
    .forEach((tx) => {
      const existing = categoryMap.get(tx.category!) || { amount: 0, count: 0 };
      categoryMap.set(tx.category!, {
        amount: existing.amount + tx.amount,
        count: existing.count + 1,
      });
    });

  const categoryBreakdown: CategorySpending[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: (data.amount / totalSpending) * 100,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate previous period change
  let previousPeriodChange: number | undefined;
  if (previousPeriodTransactions) {
    const prevSpending = previousPeriodTransactions
      .filter((tx) => affectsSpending(tx))
      .reduce((sum, tx) => sum + tx.amount, 0);

    if (prevSpending > 0) {
      previousPeriodChange = ((totalSpending - prevSpending) / prevSpending) * 100;
    }
  }

  return {
    totalSpending,
    totalPayments,
    netChange,
    categoryBreakdown,
    periodStart,
    periodEnd,
    previousPeriodChange,
  };
}

export function groupTransactionsByMonth(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = grouped.get(monthKey) || [];
    existing.push(tx);
    grouped.set(monthKey, existing);
  });

  return grouped;
}

export function calculateMonthlyTrends(
  transactions: Transaction[],
  months: number = 6
): Array<{ month: string; total: number; categories: Record<string, number> }> {
  const grouped = groupTransactionsByMonth(transactions);
  const trends: Array<{ month: string; total: number; categories: Record<string, number> }> = [];

  // Get last N months
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const monthTransactions = grouped.get(monthKey) || [];
    const monthSpending = monthTransactions.filter((tx) => affectsSpending(tx));

    const total = monthSpending.reduce((sum, tx) => sum + tx.amount, 0);

    const categories: Record<string, number> = {};
    monthSpending.forEach((tx) => {
      if (tx.category) {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
      }
    });

    trends.push({
      month: date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short' }),
      total,
      categories,
    });
  }

  return trends;
}
