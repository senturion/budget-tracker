import React, { useState } from 'react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../utils/formatters';
import { parseCategory } from '../../utils/categoryHelpers';
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
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const maxAmount = Math.max(...categories.map((c) => c.amount));

  const getBudgetForCategory = (categoryName: string) => {
    return budgetStatuses.find((status) => status.budget.category === categoryName);
  };

  // Group categories by parent
  const groupedCategories = React.useMemo(() => {
    const parentMap = new Map<string, { parent: CategorySpending; subcategories: CategorySpending[] }>();

    categories.forEach(cat => {
      const { parent, subcategory } = parseCategory(cat.category);

      if (!subcategory) {
        // This is a parent-only category
        if (!parentMap.has(parent || cat.category)) {
          parentMap.set(parent || cat.category, {
            parent: cat,
            subcategories: []
          });
        }
      } else {
        // This is a subcategory
        const parentKey = parent!;
        if (!parentMap.has(parentKey)) {
          // Create a parent entry with aggregated data
          parentMap.set(parentKey, {
            parent: {
              category: parentKey,
              amount: 0,
              percentage: 0,
              transactionCount: 0
            },
            subcategories: []
          });
        }
        const group = parentMap.get(parentKey)!;
        group.subcategories.push(cat);
        // Aggregate parent totals
        group.parent.amount += cat.amount;
        group.parent.transactionCount += cat.transactionCount;
      }
    });

    // Calculate percentages for aggregated parents
    const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
    parentMap.forEach(group => {
      if (group.subcategories.length > 0) {
        group.parent.percentage = (group.parent.amount / total) * 100;
      }
    });

    return Array.from(parentMap.values());
  }, [categories]);

  const toggleParent = (parentName: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentName)) {
        next.delete(parentName);
      } else {
        next.add(parentName);
      }
      return next;
    });
  };

  const renderCategoryCard = (category: CategorySpending, isSubcategory: boolean = false) => {
    const budgetStatus = getBudgetForCategory(category.category);

    return (
      <div
        key={category.category}
        className={`cursor-pointer hover:bg-muted/40 p-3 rounded transition-all duration-200 ${isSubcategory ? 'ml-6 border-l-2 border-border' : ''}`}
        onClick={() => onCategoryClick?.(category.category)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isSubcategory && <span className="text-text-tertiary">›</span>}
            <span className="text-text-primary font-medium">
              {isSubcategory ? parseCategory(category.category).subcategory : category.category}
            </span>
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
  };

  return (
    <Card title="Spending by Category">
      <div className="space-y-2">
        {groupedCategories.map(({ parent, subcategories }) => (
          <div key={parent.category} className="space-y-1">
            {/* Parent Category */}
            <div className="relative">
              {subcategories.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleParent(parent.category);
                  }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-muted rounded"
                >
                  <span className="text-text-tertiary text-sm">
                    {expandedParents.has(parent.category) ? '▼' : '▶'}
                  </span>
                </button>
              )}
              <div className={subcategories.length > 0 ? 'ml-6' : ''}>
                {renderCategoryCard(parent, false)}
              </div>
            </div>

            {/* Subcategories */}
            {expandedParents.has(parent.category) && subcategories.map(sub =>
              renderCategoryCard(sub, true)
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
