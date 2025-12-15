import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import {
  getMonthlyTrends,
  getCategoryTrends,
  getTopMerchants,
  getSpendingPatterns,
} from '../../utils/trendCalculations';
import { formatCurrency } from '../../utils/formatters';
import { filterTransactionsByAccount } from '../../utils/accountFilters';
import { Card } from '../common/Card';
import { SpendingOverTimeChart } from './SpendingOverTimeChart';
import { CategoryTrendsChart } from './CategoryTrendsChart';
import { SpendingPatternsChart } from './SpendingPatternsChart';
import { TopMerchantsTable } from './TopMerchantsTable';

export function Trends() {
  const { transactions, selectedAccountId } = useStore();
  const [timeRange, setTimeRange] = useState<6 | 12 | 24>(12);

  const filteredTransactions = useMemo(
    () => filterTransactionsByAccount(transactions, selectedAccountId),
    [transactions, selectedAccountId]
  );

  const monthlyTrends = useMemo(
    () => getMonthlyTrends(filteredTransactions, timeRange),
    [filteredTransactions, timeRange]
  );

  const categoryTrends = useMemo(
    () => getCategoryTrends(filteredTransactions, timeRange),
    [filteredTransactions, timeRange]
  );

  const topMerchants = useMemo(
    () => getTopMerchants(filteredTransactions, 10),
    [filteredTransactions]
  );

  const spendingPatterns = useMemo(
    () => getSpendingPatterns(filteredTransactions),
    [filteredTransactions]
  );

  const totalSpending = monthlyTrends.reduce((sum, m) => sum + m.totalSpending, 0);
  const averageMonthly = totalSpending / monthlyTrends.length;

  if (filteredTransactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-text-primary">Trends & Analytics</h2>
        </div>
        <Card>
          <div className="text-center py-12 text-text-muted">
            No transactions yet. Import some data to see trends and analytics.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-text-primary">Trends & Analytics</h2>
        <div className="flex gap-2">
          <TimeRangeButton
            active={timeRange === 6}
            onClick={() => setTimeRange(6)}
          >
            6 Months
          </TimeRangeButton>
          <TimeRangeButton
            active={timeRange === 12}
            onClick={() => setTimeRange(12)}
          >
            12 Months
          </TimeRangeButton>
          <TimeRangeButton
            active={timeRange === 24}
            onClick={() => setTimeRange(24)}
          >
            24 Months
          </TimeRangeButton>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="space-y-1">
            <div className="text-sm text-text-muted">Total Spending</div>
            <div className="text-2xl font-display font-bold text-text-primary">
              {formatCurrency(totalSpending)}
            </div>
            <div className="text-xs text-text-secondary">
              Last {timeRange} months
            </div>
          </div>
        </Card>
        <Card>
          <div className="space-y-1">
            <div className="text-sm text-text-muted">Average Monthly</div>
            <div className="text-2xl font-display font-bold text-text-primary">
              {formatCurrency(averageMonthly)}
            </div>
            <div className="text-xs text-text-secondary">
              Per month average
            </div>
          </div>
        </Card>
        <Card>
          <div className="space-y-1">
            <div className="text-sm text-text-muted">Total Transactions</div>
            <div className="text-2xl font-display font-bold text-text-primary">
              {filteredTransactions.length.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary">
              All time
            </div>
          </div>
        </Card>
      </div>

      {/* Spending Over Time */}
      <Card>
        <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
          Spending Over Time
        </h3>
        <SpendingOverTimeChart data={monthlyTrends} />
      </Card>

      {/* Category Trends */}
      <Card>
        <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
          Category Trends
        </h3>
        <CategoryTrendsChart data={categoryTrends.slice(0, 8)} />
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Patterns */}
        <Card>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
            Spending Patterns
          </h3>
          <SpendingPatternsChart data={spendingPatterns} />
        </Card>

        {/* Top Merchants */}
        <Card>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
            Top Merchants
          </h3>
          <TopMerchantsTable merchants={topMerchants} />
        </Card>
      </div>

      {/* Category Insights */}
      <Card>
        <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
          Category Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryTrends.slice(0, 6).map(trend => (
            <div
              key={trend.category}
              className="p-4 bg-background rounded-lg border border-border"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-text-primary">
                  {trend.category}
                </div>
                <TrendBadge trend={trend.trend} />
              </div>
              <div className="text-xl font-display font-bold text-text-primary mb-1">
                {formatCurrency(trend.total)}
              </div>
              <div className="text-xs text-text-muted">
                Avg: {formatCurrency(trend.average)}/mo
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TimeRangeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-background-alt shadow-glow-sm'
          : 'bg-muted text-text-secondary hover:bg-muted/80 hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const config = {
    up: { label: '↑', color: 'text-red-400' },
    down: { label: '↓', color: 'text-green-400' },
    stable: { label: '→', color: 'text-text-muted' },
  };

  const { label, color } = config[trend];

  return (
    <span className={`text-xs font-bold ${color}`}>
      {label}
    </span>
  );
}
