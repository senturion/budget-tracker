import React from 'react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../utils/formatters';
import type { CategorySpending, BudgetStatus } from '../../types';

interface SpendingBreakdownProps {
  categories: CategorySpending[];
  budgetStatuses?: BudgetStatus[];
  onCategoryClick?: (category: string) => void;
}

export const SpendingBreakdown: React.FC<SpendingBreakdownProps> = ({
  categories,
  budgetStatuses = [],
  onCategoryClick,
}) => {
  const maxAmount = Math.max(...categories.map((c) => c.amount));

  const getBudgetForCategory = (categoryName: string) => {
    return budgetStatuses.find((status) => status.budget.category === categoryName);
  };

  return (
    <Card title="Spending by Category">
      <div className="space-y-4">
        {categories.map((category) => {
          const budgetStatus = getBudgetForCategory(category.category);

          return (
            <div
              key={category.category}
              className="cursor-pointer hover:bg-muted/40 p-3 rounded transition-all duration-200"
              onClick={() => onCategoryClick?.(category.category)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-medium">{category.category}</span>
                  {budgetStatus && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        budgetStatus.isOverBudget
                          ? 'bg-negative/20 text-negative border border-negative/30'
                          : budgetStatus.isNearLimit
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-positive/20 text-positive border border-positive/30'
                      }`}
                    >
                      {budgetStatus.isOverBudget
                        ? 'Over'
                        : budgetStatus.isNearLimit
                        ? 'Warning'
                        : 'On Track'}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-text-primary font-mono font-semibold">
                    {formatCurrency(category.amount)}
                  </span>
                  {budgetStatus ? (
                    <span className="text-text-secondary text-sm ml-2">
                      / {formatCurrency(budgetStatus.budget.monthlyLimit)}
                    </span>
                  ) : (
                    <span className="text-text-secondary text-sm ml-2">
                      ({category.percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-background-alt rounded-full h-2 overflow-hidden">
                {budgetStatus ? (
                  <div
                    className={`h-2 rounded-full transition-all ${
                      budgetStatus.isOverBudget
                        ? 'bg-negative shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                        : budgetStatus.isNearLimit
                        ? 'bg-primary shadow-glow-sm'
                        : 'bg-positive shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    }`}
                    style={{ width: `${Math.min(budgetStatus.percentage, 100)}%` }}
                  />
                ) : (
                  <div
                    className="bg-primary h-2 rounded-full transition-all shadow-glow-sm"
                    style={{ width: `${(category.amount / maxAmount) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-text-secondary">
                  {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''}
                </div>
                {budgetStatus && (
                  <div className="text-xs text-text-tertiary">
                    {budgetStatus.percentage.toFixed(1)}% of budget
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
