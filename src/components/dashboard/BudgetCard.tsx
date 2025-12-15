import React from 'react';
import type { BudgetStatus } from '../../types';

interface BudgetCardProps {
  budgetStatus: BudgetStatus;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budgetStatus }) => {
  const { budget, spent, remaining, percentage, isOverBudget, isNearLimit } = budgetStatus;

  // Determine status color and glow
  const getStatusStyles = () => {
    if (isOverBudget) {
      return {
        barColor: 'bg-negative',
        glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
        textColor: 'text-negative',
        borderColor: 'border-negative/30',
      };
    }
    if (isNearLimit) {
      return {
        barColor: 'bg-primary',
        glowColor: 'shadow-glow-md',
        textColor: 'text-primary',
        borderColor: 'border-primary/30',
      };
    }
    return {
      barColor: 'bg-positive',
      glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      textColor: 'text-positive',
      borderColor: 'border-border',
    };
  };

  const styles = getStatusStyles();
  const cappedPercentage = Math.min(percentage, 100);

  return (
    <div
      className={`bg-surface/80 backdrop-blur-md border ${styles.borderColor} rounded-lg p-4 transition-all hover:border-opacity-100 ${isOverBudget || isNearLimit ? styles.glowColor : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-text-primary">{budget.category}</h3>
        <span className={`text-sm font-medium ${styles.textColor}`}>
          {isOverBudget ? 'Over Budget' : isNearLimit ? 'Near Limit' : 'On Track'}
        </span>
      </div>

      {/* Amount Display */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className={`text-2xl font-bold ${styles.textColor}`}>
            ${spent.toFixed(2)}
          </span>
          <span className="text-text-secondary text-sm ml-2">
            of ${budget.monthlyLimit.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${remaining >= 0 ? 'text-text-secondary' : styles.textColor}`}>
            {remaining >= 0 ? `$${remaining.toFixed(2)} left` : `$${Math.abs(remaining).toFixed(2)} over`}
          </div>
          <div className="text-xs text-text-tertiary">
            {percentage.toFixed(1)}% used
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full ${styles.barColor} transition-all duration-500 ease-out`}
          style={{ width: `${cappedPercentage}%` }}
        />
        {/* Alert threshold marker */}
        {budget.alertThreshold < 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-text-tertiary/50"
            style={{ left: `${budget.alertThreshold}%` }}
            title={`Alert at ${budget.alertThreshold}%`}
          />
        )}
      </div>

      {/* Alert Threshold Info */}
      {isNearLimit && !isOverBudget && (
        <p className="text-xs text-text-tertiary mt-2">
          Alert threshold: {budget.alertThreshold}%
        </p>
      )}
    </div>
  );
};
