import React from 'react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../utils/formatters';
import type { SpendingSummary } from '../../types';

interface SummaryCardsProps {
  summary: SpendingSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary mb-1">Total Spending</span>
          <span className="text-2xl font-bold font-mono text-text-primary">
            {formatCurrency(summary.totalSpending)}
          </span>
          {summary.previousPeriodChange !== undefined && (
            <span
              className={`text-sm mt-2 ${
                summary.previousPeriodChange > 0 ? 'text-negative' : 'text-positive'
              }`}
            >
              {summary.previousPeriodChange > 0 ? '↑' : '↓'}{' '}
              {Math.abs(summary.previousPeriodChange).toFixed(1)}% vs last period
            </span>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary mb-1">Total Payments</span>
          <span className="text-2xl font-bold font-mono text-positive">
            {formatCurrency(summary.totalPayments)}
          </span>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary mb-1">Net Change</span>
          <span
            className={`text-2xl font-bold font-mono ${
              summary.netChange > 0 ? 'text-negative' : 'text-positive'
            }`}
          >
            {summary.netChange > 0 ? '+' : ''}
            {formatCurrency(summary.netChange)}
          </span>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary mb-1">Categories</span>
          <span className="text-2xl font-bold font-mono text-text-primary">
            {summary.categoryBreakdown.length}
          </span>
          <span className="text-sm text-text-secondary mt-2">
            {summary.categoryBreakdown.reduce((sum, cat) => sum + cat.transactionCount, 0)}{' '}
            transactions
          </span>
        </div>
      </Card>
    </div>
  );
};
