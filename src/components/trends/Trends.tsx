import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import {
  getMonthlyTrends,
  getDailyTrends,
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

type DateRangeType = '1m' | '3m' | '6m' | '12m' | 'ytd' | 'custom';

export function Trends() {
  const { transactions, selectedAccountId, setCurrentView, setTransactionCategoryFilter } = useStore();
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('12m');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Calculate the actual date range based on type
  const { startDate, endDate, monthsBack } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = new Date();
    let months: number;

    switch (dateRangeType) {
      case '1m':
        months = 1;
        start = new Date(now.getFullYear(), now.getMonth() - 0, 1);
        break;
      case '3m':
        months = 3;
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case '6m':
        months = 6;
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case '12m':
        months = 12;
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        break;
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1);
        months = now.getMonth() + 1;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          start = new Date(customStartDate);
          end = new Date(customEndDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          months = Math.ceil(diffDays / 30);
        } else {
          months = 12;
          start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        }
        break;
      default:
        months = 12;
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    return { startDate: start, endDate: end, monthsBack: months };
  }, [dateRangeType, customStartDate, customEndDate]);

  const filteredTransactions = useMemo(() => {
    let filtered = filterTransactionsByAccount(transactions, selectedAccountId);

    // Filter by date range
    if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      });
    }

    return filtered;
  }, [transactions, selectedAccountId, dateRangeType, customStartDate, customEndDate, startDate, endDate]);

  // Use daily trends for 1 month view, monthly for others
  const dailyTrends = useMemo(
    () => dateRangeType === '1m' ? getDailyTrends(filteredTransactions, 30) : [],
    [filteredTransactions, dateRangeType]
  );

  const monthlyTrends = useMemo(
    () => dateRangeType !== '1m' ? getMonthlyTrends(filteredTransactions, monthsBack) : [],
    [filteredTransactions, monthsBack, dateRangeType]
  );

  const categoryTrends = useMemo(
    () => getCategoryTrends(filteredTransactions, monthsBack),
    [filteredTransactions, monthsBack]
  );

  const topMerchants = useMemo(
    () => getTopMerchants(filteredTransactions, 10),
    [filteredTransactions]
  );

  const spendingPatterns = useMemo(
    () => getSpendingPatterns(filteredTransactions),
    [filteredTransactions]
  );

  const totalSpending = dateRangeType === '1m'
    ? dailyTrends.reduce((sum, d) => sum + d.totalSpending, 0)
    : monthlyTrends.reduce((sum, m) => sum + m.totalSpending, 0);

  const averageMonthly = dateRangeType === '1m'
    ? dailyTrends.length > 0 ? totalSpending / (dailyTrends.length / 30) : 0
    : monthlyTrends.length > 0 ? totalSpending / monthlyTrends.length : 0;

  const handleCategoryClick = (category: string) => {
    setTransactionCategoryFilter(category);
    setCurrentView('transactions');
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setShowCustomDatePicker(false);
    }
  };

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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-text-primary">Trends & Analytics</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <TimeRangeButton
            active={dateRangeType === '1m'}
            onClick={() => setDateRangeType('1m')}
          >
            1 Month
          </TimeRangeButton>
          <TimeRangeButton
            active={dateRangeType === '3m'}
            onClick={() => setDateRangeType('3m')}
          >
            3 Months
          </TimeRangeButton>
          <TimeRangeButton
            active={dateRangeType === '6m'}
            onClick={() => setDateRangeType('6m')}
          >
            6 Months
          </TimeRangeButton>
          <TimeRangeButton
            active={dateRangeType === '12m'}
            onClick={() => setDateRangeType('12m')}
          >
            12 Months
          </TimeRangeButton>
          <TimeRangeButton
            active={dateRangeType === 'ytd'}
            onClick={() => setDateRangeType('ytd')}
          >
            Year to Date
          </TimeRangeButton>
          <TimeRangeButton
            active={dateRangeType === 'custom'}
            onClick={() => {
              setDateRangeType('custom');
              setShowCustomDatePicker(true);
            }}
          >
            Custom Range
          </TimeRangeButton>
        </div>

        {/* Custom Date Range Picker */}
        {showCustomDatePicker && dateRangeType === 'custom' && (
          <Card>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleApplyCustomRange}
                disabled={!customStartDate || !customEndDate}
                className="px-4 py-2 bg-primary text-background-alt rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Apply
              </button>
              <button
                onClick={() => setShowCustomDatePicker(false)}
                className="px-4 py-2 bg-muted text-text-secondary rounded-lg font-medium hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
            </div>
          </Card>
        )}
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
              {dateRangeType === 'ytd' ? 'Year to date' :
               dateRangeType === 'custom' ? 'Custom range' :
               `Last ${monthsBack} month${monthsBack > 1 ? 's' : ''}`}
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
          {dateRangeType === '1m' && (
            <span className="text-sm text-text-muted ml-2 font-normal">Daily view</span>
          )}
        </h3>
        <SpendingOverTimeChart
          data={dateRangeType === '1m' ? dailyTrends : monthlyTrends}
          viewType={dateRangeType === '1m' ? 'daily' : 'monthly'}
        />
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

      {/* Category Insights - Clickable */}
      <Card>
        <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
          Category Insights
          <span className="text-sm text-text-muted ml-2 font-normal">Click to view transactions</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryTrends.map(trend => {
            // Get transactions for this category
            const categoryTransactions = filteredTransactions.filter(
              tx => tx.category === trend.category && tx.amount > 0
            );
            const transactionCount = categoryTransactions.length;
            const percentOfTotal = totalSpending > 0 ? (trend.total / totalSpending) * 100 : 0;

            return (
              <button
                key={trend.category}
                onClick={() => handleCategoryClick(trend.category)}
                className="p-4 bg-background rounded-lg border border-border hover:border-primary hover:shadow-glow-sm transition-all text-left group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                    {trend.category}
                  </div>
                  <TrendBadge trend={trend.trend} />
                </div>
                <div className="text-xl font-display font-bold text-text-primary mb-1">
                  {formatCurrency(trend.total)}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-text-muted">
                    Avg: {formatCurrency(trend.average)}/mo
                  </div>
                  <div className="text-xs text-text-secondary">
                    {transactionCount} transaction{transactionCount !== 1 ? 's' : ''} · {percentOfTotal.toFixed(1)}% of total
                  </div>
                </div>
                <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                  />
                </div>
              </button>
            );
          })}
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
