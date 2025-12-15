import React from 'react';
import type { BudgetStatus } from '../../types';

interface BudgetAlertsProps {
  budgetStatuses: BudgetStatus[];
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({ budgetStatuses }) => {
  const overBudgetItems = budgetStatuses.filter((status) => status.isOverBudget);
  const nearLimitItems = budgetStatuses.filter((status) => status.isNearLimit && !status.isOverBudget);

  if (overBudgetItems.length === 0 && nearLimitItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Over Budget Alerts */}
      {overBudgetItems.length > 0 && (
        <div className="bg-negative/10 backdrop-blur-md border border-negative/30 rounded-lg p-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-negative flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-negative font-semibold mb-1">Budget Exceeded</h3>
              <p className="text-text-secondary text-sm mb-2">
                {overBudgetItems.length === 1
                  ? 'One category has exceeded its budget:'
                  : `${overBudgetItems.length} categories have exceeded their budgets:`}
              </p>
              <ul className="space-y-1">
                {overBudgetItems.map((status) => (
                  <li key={status.budget.id} className="text-sm text-text-primary">
                    <span className="font-medium">{status.budget.category}:</span>{' '}
                    <span className="text-negative">
                      ${status.spent.toFixed(2)} / ${status.budget.monthlyLimit.toFixed(2)}
                    </span>{' '}
                    <span className="text-text-tertiary">
                      (${Math.abs(status.remaining).toFixed(2)} over)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Near Limit Warnings */}
      {nearLimitItems.length > 0 && (
        <div className="bg-primary/10 backdrop-blur-md border border-primary/30 rounded-lg p-4 shadow-glow-md">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-primary flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-primary font-semibold mb-1">Budget Warning</h3>
              <p className="text-text-secondary text-sm mb-2">
                {nearLimitItems.length === 1
                  ? 'One category is approaching its budget limit:'
                  : `${nearLimitItems.length} categories are approaching their budget limits:`}
              </p>
              <ul className="space-y-1">
                {nearLimitItems.map((status) => (
                  <li key={status.budget.id} className="text-sm text-text-primary">
                    <span className="font-medium">{status.budget.category}:</span>{' '}
                    <span className="text-primary">{status.percentage.toFixed(1)}% used</span>{' '}
                    <span className="text-text-tertiary">
                      (${status.remaining.toFixed(2)} remaining)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
