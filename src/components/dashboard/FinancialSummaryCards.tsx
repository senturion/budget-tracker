import React from 'react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../utils/formatters';
import type { FinancialSummary } from '../../utils/financialCalculations';
import type { Account } from '../../types';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  previousPeriodChange?: number;
  account?: Account; // Current account being viewed (if filtered)
  onTransactionTypeClick?: (type: string) => void;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  summary,
  previousPeriodChange,
  account,
  onTransactionTypeClick
}) => {
  const savingsRate = summary.income.total > 0
    ? ((summary.netWorthChange / summary.income.total) * 100).toFixed(1)
    : '0.0';

  const isCreditAccount = account?.accountType === 'CREDIT_CARD';

  // For credit accounts: positive netWorthChange means you're spending more than paying off (bad)
  // For other accounts: positive netWorthChange is good (income > expenses)
  const creditBalance = isCreditAccount ? summary.expenses.total - summary.income.total : 0;
  const isPayingOffCredit = isCreditAccount && summary.income.total > summary.expenses.total;

  return (
    <div className="space-y-6">
      {/* Credit Account Alert */}
      {isCreditAccount && creditBalance > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-negative/10 rounded-full flex items-center justify-center">
              <span className="text-negative text-xl">⚠️</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-text-primary">
                Credit Balance Increasing
              </div>
              <div className="text-sm text-text-secondary">
                You spent {formatCurrency(summary.expenses.total)} but only paid {formatCurrency(summary.income.total)}
                {' '}— balance increased by {formatCurrency(creditBalance)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isCreditAccount && isPayingOffCredit && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-positive/10 rounded-full flex items-center justify-center">
              <span className="text-positive text-xl">✓</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-text-primary">
                Paying Down Credit
              </div>
              <div className="text-sm text-text-secondary">
                Payments ({formatCurrency(summary.income.total)}) exceeded spending ({formatCurrency(summary.expenses.total)})
                {' '}— balance decreased by {formatCurrency(Math.abs(creditBalance))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Primary Metrics - Net Worth Impact */}
      <div>
        <h2 className="text-lg font-display font-semibold text-text-primary mb-3">
          {isCreditAccount ? 'Credit Account Activity' : 'Net Worth Impact'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Income (Earned + Passive) OR Payments (for credit) */}
          <Card
            onClick={() => onTransactionTypeClick?.('INFLOW')}
            className="cursor-pointer hover:shadow-glow-md transition-all"
          >
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">
                {isCreditAccount ? 'Total Payments' : 'Total Income'}
              </span>
              <span className="text-2xl font-bold font-mono text-positive">
                {formatCurrency(summary.income.total)}
              </span>
              {!isCreditAccount && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Earned</span>
                    <span className="text-text-secondary font-mono">
                      {formatCurrency(summary.income.earned)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Passive</span>
                    <span className="text-text-secondary font-mono">
                      {formatCurrency(summary.income.passive)}
                    </span>
                  </div>
                </div>
              )}
              {isCreditAccount && (
                <div className="mt-2 text-xs text-text-muted">
                  Money paid toward balance
                </div>
              )}
            </div>
          </Card>

          {/* Total Expenses OR Charges (for credit) */}
          <Card
            onClick={() => onTransactionTypeClick?.('EXPENSE')}
            className="cursor-pointer hover:shadow-glow-md transition-all"
          >
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">
                {isCreditAccount ? 'Total Charges' : 'Total Expenses'}
              </span>
              <span className="text-2xl font-bold font-mono text-negative">
                {formatCurrency(summary.expenses.total)}
              </span>
              {previousPeriodChange !== undefined && (
                <span
                  className={`text-sm mt-2 ${
                    previousPeriodChange > 0 ? 'text-negative' : 'text-positive'
                  }`}
                >
                  {previousPeriodChange > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(previousPeriodChange).toFixed(1)}% vs last month
                </span>
              )}
              <div className="mt-2 text-xs text-text-muted">
                {summary.expenses.count} transactions
              </div>
            </div>
          </Card>

          {/* Net Worth Change OR Balance Change (for credit) */}
          <Card>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">
                {isCreditAccount ? 'Balance Change' : 'Net Worth Change'}
              </span>
              <span
                className={`text-2xl font-bold font-mono ${
                  isCreditAccount
                    ? (creditBalance <= 0 ? 'text-positive' : 'text-negative')
                    : (summary.netWorthChange >= 0 ? 'text-positive' : 'text-negative')
                }`}
              >
                {isCreditAccount ? (
                  <>
                    {creditBalance > 0 ? '+' : ''}
                    {formatCurrency(creditBalance)}
                  </>
                ) : (
                  <>
                    {summary.netWorthChange >= 0 ? '+' : ''}
                    {formatCurrency(summary.netWorthChange)}
                  </>
                )}
              </span>
              <div className="mt-2 text-xs text-text-muted">
                {isCreditAccount ? (
                  creditBalance <= 0 ? 'Paying down debt' : 'Adding to balance'
                ) : (
                  `Savings Rate: ${savingsRate}%`
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Secondary Metrics - Money Movement (Informational) */}
      <div>
        <h2 className="text-lg font-display font-semibold text-text-primary mb-3">
          Money Movement (Informational)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reimbursements & Windfalls */}
          <Card
            onClick={() => onTransactionTypeClick?.('INFLOW')}
            className="cursor-pointer hover:shadow-glow-md transition-all"
          >
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">
                Reimbursements & Windfalls
              </span>
              <span className="text-xl font-bold font-mono text-text-primary">
                {formatCurrency(summary.income.reimbursement + summary.income.windfall)}
              </span>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Refunds/Returns</span>
                  <span className="text-text-secondary font-mono">
                    {formatCurrency(summary.income.reimbursement)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Gifts/Settlements</span>
                  <span className="text-text-secondary font-mono">
                    {formatCurrency(summary.income.windfall)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Transfers */}
          <Card
            onClick={() => onTransactionTypeClick?.('TRANSFER')}
            className="cursor-pointer hover:shadow-glow-md transition-all"
          >
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Transfers</span>
              <span className="text-xl font-bold font-mono text-text-primary">
                {formatCurrency(summary.transfers.total)}
              </span>
              <div className="mt-2 text-xs text-text-muted">
                {summary.transfers.count} transfers (net-zero)
              </div>
              <div className="mt-1 text-xs text-text-muted">
                Not counted in net worth
              </div>
            </div>
          </Card>

          {/* Adjustments */}
          <Card
            onClick={() => onTransactionTypeClick?.('ADJUSTMENT')}
            className="cursor-pointer hover:shadow-glow-md transition-all"
          >
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Adjustments</span>
              <span className="text-xl font-bold font-mono text-text-primary">
                {formatCurrency(summary.adjustments.total)}
              </span>
              <div className="mt-2 text-xs text-text-muted">
                {summary.adjustments.count} corrections
              </div>
              <div className="mt-1 text-xs text-text-muted">
                Balance fixes & reconciliations
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Cash Flow (Total Money Movement) */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-text-secondary">Total Cash Flow</span>
            <div className="text-xl font-bold font-mono text-text-primary mt-1">
              {formatCurrency(summary.cashFlow)}
            </div>
          </div>
          <div className="text-right text-xs text-text-muted">
            <div>All money movement</div>
            <div className="mt-1">
              Income + Expenses + Transfers
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
