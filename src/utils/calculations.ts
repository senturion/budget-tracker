import type { Transaction, CategorySpending, SpendingSummary } from '../types';

export function calculateSpendingSummary(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  previousPeriodTransactions?: Transaction[]
): SpendingSummary {
  // Calculate totals
  let totalSpending = 0;
  let totalPayments = 0;

  transactions.forEach((tx) => {
    if (tx.amount > 0) {
      totalSpending += tx.amount;
    } else {
      totalPayments += Math.abs(tx.amount);
    }
  });

  const netChange = totalSpending - totalPayments;

  // Calculate category breakdown
  const categoryMap = new Map<string, { amount: number; count: number }>();

  transactions
    .filter((tx) => tx.amount > 0) // Only count spending, not payments
    .forEach((tx) => {
      const existing = categoryMap.get(tx.category) || { amount: 0, count: 0 };
      categoryMap.set(tx.category, {
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
      .filter((tx) => tx.amount > 0)
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
    const monthSpending = monthTransactions.filter((tx) => tx.amount > 0);

    const total = monthSpending.reduce((sum, tx) => sum + tx.amount, 0);

    const categories: Record<string, number> = {};
    monthSpending.forEach((tx) => {
      categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
    });

    trends.push({
      month: date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short' }),
      total,
      categories,
    });
  }

  return trends;
}
