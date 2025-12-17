import type { Transaction, CategorySpending } from '../types';
import { affectsSpending, affectsIncome } from './transactionValidation';

export interface MonthlyTrend {
  month: string; // YYYY-MM
  year: number;
  monthName: string;
  totalSpending: number;
  totalPayments: number;
  netChange: number;
  transactionCount: number;
  categoryBreakdown: CategorySpending[];
}

export interface CategoryTrend {
  category: string;
  months: {
    month: string;
    amount: number;
  }[];
  total: number;
  average: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MerchantInsight {
  merchant: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  category: string;
  lastTransaction: string;
}

export interface SpendingPattern {
  dayOfWeek: {
    day: string;
    amount: number;
    count: number;
  }[];
  timeOfMonth: {
    period: string; // 'early' | 'mid' | 'late'
    amount: number;
    count: number;
  }[];
}

export function getMonthlyTrends(transactions: Transaction[], monthsBack: number = 12): MonthlyTrend[] {
  const now = new Date();
  const trends: MonthlyTrend[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === year && txDate.getMonth() === month;
    });

    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalSpending = 0;
    let totalPayments = 0;

    monthTransactions.forEach(tx => {
      // Only count EXPENSE transactions that affect budget
      if (affectsSpending(tx)) {
        totalSpending += tx.amount;
        if (tx.category) {
          const existing = categoryMap.get(tx.category) || { amount: 0, count: 0 };
          categoryMap.set(tx.category, {
            amount: existing.amount + tx.amount,
            count: existing.count + 1,
          });
        }
      } else if (affectsIncome(tx)) {
        // Only count EARNED and PASSIVE income as "payments"
        totalPayments += tx.amount;
      }
    });

    const categoryBreakdown: CategorySpending[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    trends.push({
      month: monthKey,
      year,
      monthName: targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      totalSpending,
      totalPayments,
      netChange: totalPayments - totalSpending,
      transactionCount: monthTransactions.length,
      categoryBreakdown,
    });
  }

  return trends;
}

export function getCategoryTrends(transactions: Transaction[], monthsBack: number = 12): CategoryTrend[] {
  const monthlyTrends = getMonthlyTrends(transactions, monthsBack);
  const categoryMap = new Map<string, Map<string, number>>();

  monthlyTrends.forEach(trend => {
    trend.categoryBreakdown.forEach(cat => {
      if (!categoryMap.has(cat.category)) {
        categoryMap.set(cat.category, new Map());
      }
      categoryMap.get(cat.category)!.set(trend.month, cat.amount);
    });
  });

  const categoryTrends: CategoryTrend[] = Array.from(categoryMap.entries()).map(([category, monthsMap]) => {
    const months = Array.from(monthsMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    const total = months.reduce((sum, m) => sum + m.amount, 0);
    const average = months.length > 0 ? total / months.length : 0;

    // Simple trend calculation: compare first half to second half
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (months.length >= 2) {
      const midpoint = Math.floor(months.length / 2);
      const firstHalfSum = months.slice(0, midpoint).reduce((sum, m) => sum + m.amount, 0);
      const secondHalfSum = months.slice(midpoint).reduce((sum, m) => sum + m.amount, 0);
      const firstHalfAvg = midpoint > 0 ? firstHalfSum / midpoint : 0;
      const secondHalfAvg = (months.length - midpoint) > 0 ? secondHalfSum / (months.length - midpoint) : 0;

      if (firstHalfAvg > 0) {
        const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        if (changePercent > 10) trend = 'up';
        else if (changePercent < -10) trend = 'down';
      }
    }

    return {
      category,
      months,
      total,
      average,
      trend,
    };
  });

  return categoryTrends.sort((a, b) => b.total - a.total);
}

export function getTopMerchants(transactions: Transaction[], limit: number = 10): MerchantInsight[] {
  const merchantMap = new Map<string, {
    totalSpent: number;
    count: number;
    category: string;
    lastTransaction: string;
  }>();

  transactions
    .filter(tx => affectsSpending(tx)) // Only expenses that affect budget
    .forEach(tx => {
      const existing = merchantMap.get(tx.merchant) || {
        totalSpent: 0,
        count: 0,
        category: tx.category,
        lastTransaction: tx.date,
      };

      merchantMap.set(tx.merchant, {
        totalSpent: existing.totalSpent + tx.amount,
        count: existing.count + 1,
        category: tx.category || 'Uncategorized',
        lastTransaction: tx.date > existing.lastTransaction ? tx.date : existing.lastTransaction,
      });
    });

  const insights: MerchantInsight[] = Array.from(merchantMap.entries())
    .map(([merchant, data]) => ({
      merchant,
      totalSpent: data.totalSpent,
      transactionCount: data.count,
      averageTransaction: data.totalSpent / data.count,
      category: data.category,
      lastTransaction: data.lastTransaction,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);

  return insights;
}

export function getSpendingPatterns(transactions: Transaction[]): SpendingPattern {
  const dayOfWeekMap = new Map<string, { amount: number; count: number }>();
  const timeOfMonthMap = new Map<string, { amount: number; count: number }>();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  transactions
    .filter(tx => affectsSpending(tx)) // Only expenses that affect budget
    .forEach(tx => {
      const txDate = new Date(tx.date);

      // Day of week
      const dayName = dayNames[txDate.getDay()];
      const dayData = dayOfWeekMap.get(dayName) || { amount: 0, count: 0 };
      dayOfWeekMap.set(dayName, {
        amount: dayData.amount + tx.amount,
        count: dayData.count + 1,
      });

      // Time of month
      const dayOfMonth = txDate.getDate();
      let period: string;
      if (dayOfMonth <= 10) period = 'early';
      else if (dayOfMonth <= 20) period = 'mid';
      else period = 'late';

      const timeData = timeOfMonthMap.get(period) || { amount: 0, count: 0 };
      timeOfMonthMap.set(period, {
        amount: timeData.amount + tx.amount,
        count: timeData.count + 1,
      });
    });

  return {
    dayOfWeek: dayNames.map(day => ({
      day,
      amount: dayOfWeekMap.get(day)?.amount || 0,
      count: dayOfWeekMap.get(day)?.count || 0,
    })),
    timeOfMonth: ['early', 'mid', 'late'].map(period => ({
      period,
      amount: timeOfMonthMap.get(period)?.amount || 0,
      count: timeOfMonthMap.get(period)?.count || 0,
    })),
  };
}
