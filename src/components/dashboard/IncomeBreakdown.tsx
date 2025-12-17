import React from 'react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../utils/formatters';
import { getIncomeSources } from '../../utils/financialCalculations';
import type { Transaction } from '../../types';

interface IncomeBreakdownProps {
  transactions: Transaction[];
  onIncomeClick?: () => void;
}

export const IncomeBreakdown: React.FC<IncomeBreakdownProps> = ({ transactions, onIncomeClick }) => {
  const incomeSources = getIncomeSources(transactions);

  if (incomeSources.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-text-primary">Income Breakdown</h3>
        <p className="text-text-muted text-sm">No income recorded for this period.</p>
      </Card>
    );
  }

  const total = incomeSources.reduce((sum, source) => sum + source.amount, 0);

  return (
    <Card
      onClick={onIncomeClick}
      className={onIncomeClick ? "cursor-pointer hover:shadow-glow-md transition-all" : ""}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Income Breakdown</h3>
        <span className="text-sm text-text-secondary font-mono">
          {formatCurrency(total)}
        </span>
      </div>

      <div className="space-y-4">
        {incomeSources.map((source) => (
          <div key={source.source}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-primary">{source.source}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">
                  {source.percentage.toFixed(1)}%
                </span>
                <span className="text-sm font-mono font-semibold text-positive">
                  {formatCurrency(source.amount)}
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-positive transition-all"
                style={{ width: `${source.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            {incomeSources.length} income source{incomeSources.length !== 1 ? 's' : ''}
          </span>
          <span className="text-text-primary font-mono font-semibold">
            Total: {formatCurrency(total)}
          </span>
        </div>
      </div>
    </Card>
  );
};
