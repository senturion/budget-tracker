import React, { useMemo } from 'react';
import { useStore } from '../../store';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { calculateCreditCardMetrics } from '../../utils/accountMetrics';
import { getMonthStart, getMonthEnd, formatMonthYear, formatCurrency } from '../../utils/formatters';
import { filterTransactionsByAccount } from '../../utils/accountFilters';
import { getExpenseCategories } from '../../utils/financialCalculations';
import type { CreditCardAccount, CategorySpending } from '../../types';

interface CreditCardDashboardProps {
  account: CreditCardAccount;
}

export const CreditCardDashboard: React.FC<CreditCardDashboardProps> = ({ account }) => {
  const { transactions, selectedMonth, setSelectedMonth, setCurrentView } = useStore();

  const filteredTransactions = useMemo(
    () => filterTransactionsByAccount(transactions, account.id),
    [transactions, account.id]
  );

  const monthStart = useMemo(() => getMonthStart(selectedMonth), [selectedMonth]);
  const monthEnd = useMemo(() => getMonthEnd(selectedMonth), [selectedMonth]);

  const currentMonthTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (tx) => new Date(tx.date) >= new Date(monthStart) && new Date(tx.date) <= new Date(monthEnd)
      ),
    [filteredTransactions, monthStart, monthEnd]
  );

  const metrics = useMemo(
    () => calculateCreditCardMetrics(account, currentMonthTransactions),
    [account, currentMonthTransactions]
  );

  const categoryBreakdown: CategorySpending[] = useMemo(
    () => getExpenseCategories(currentMonthTransactions),
    [currentMonthTransactions]
  );

  const handlePreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  if (transactions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-3xl font-display font-bold mb-4 text-text-primary">Welcome to Budget Tracker</h1>
        <p className="text-text-secondary mb-6">
          Get started by importing your credit card transactions
        </p>
        <Button onClick={() => setCurrentView('upload')}>Import Transactions</Button>
      </div>
    );
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-negative';
    if (utilization >= 70) return 'text-amber-500';
    if (utilization >= 50) return 'text-yellow-500';
    return 'text-positive';
  };

  const getUtilizationBarColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-negative';
    if (utilization >= 70) return 'bg-amber-500';
    if (utilization >= 50) return 'bg-yellow-500';
    return 'bg-positive';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Account Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: account.color }}
          >
            {account.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary">{account.name}</h1>
            <p className="text-text-secondary">
              {account.issuer ? `${account.issuer}` : 'Credit Card'}
              {account.institution ? ` • ${account.institution}` : ''}
            </p>
          </div>
        </div>

        {/* Balance Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {metrics.balanceOwed !== undefined ? (
              <>
                <p className="text-sm text-text-secondary">Balance Owed</p>
                <p className="text-3xl font-bold text-negative">
                  {formatCurrency(metrics.balanceOwed)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">Balance Owed</p>
                <p className="text-lg text-text-muted">Not set</p>
              </>
            )}
          </div>

          <div>
            {metrics.availableCredit !== undefined ? (
              <>
                <p className="text-sm text-text-secondary">Available Credit</p>
                <p className="text-3xl font-bold text-positive">
                  {formatCurrency(metrics.availableCredit)}
                </p>
              </>
            ) : metrics.creditLimit !== undefined ? (
              <>
                <p className="text-sm text-text-secondary">Credit Limit</p>
                <p className="text-3xl font-bold text-text-primary">
                  {formatCurrency(metrics.creditLimit)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">Credit Limit</p>
                <p className="text-lg text-text-muted">Not set</p>
              </>
            )}
          </div>
        </div>

        {/* Utilization Bar */}
        {metrics.utilizationPercent !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Credit Utilization</span>
              <span className={`text-sm font-bold ${getUtilizationColor(metrics.utilizationPercent)}`}>
                {metrics.utilizationPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getUtilizationBarColor(metrics.utilizationPercent)}`}
                style={{ width: `${Math.min(metrics.utilizationPercent, 100)}%` }}
              />
            </div>
            {metrics.utilizationPercent >= 70 && (
              <p className="text-xs text-amber-500 mt-1">
                High utilization may impact your credit score
              </p>
            )}
          </div>
        )}
      </div>

      {/* Statement Block */}
      {(metrics.statementDay || metrics.dueDay || metrics.minPayment || metrics.paymentStatus) && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-text-primary">Payment Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.statementDay && (
              <div>
                <p className="text-sm text-text-secondary">Statement Closes</p>
                <p className="text-lg font-semibold text-text-primary">
                  {metrics.statementDay}
                  <span className="text-sm text-text-muted">{' '}of month</span>
                </p>
              </div>
            )}
            {metrics.dueDay && (
              <div>
                <p className="text-sm text-text-secondary">Payment Due</p>
                <p className="text-lg font-semibold text-text-primary">
                  {metrics.dueDay}
                  <span className="text-sm text-text-muted">{' '}of month</span>
                </p>
              </div>
            )}
            {metrics.minPayment && (
              <div>
                <p className="text-sm text-text-secondary">Minimum Payment</p>
                <p className="text-lg font-semibold text-text-primary">
                  {formatCurrency(metrics.minPayment)}
                </p>
              </div>
            )}
            {metrics.paymentStatus && (
              <div>
                <p className="text-sm text-text-secondary">Status</p>
                <p className={`text-lg font-semibold ${
                  metrics.paymentStatus === 'OK' ? 'text-positive' :
                  metrics.paymentStatus === 'DUE_SOON' ? 'text-amber-500' :
                  'text-negative'
                }`}>
                  {metrics.paymentStatus === 'OK' ? 'OK' :
                   metrics.paymentStatus === 'DUE_SOON' ? 'Due Soon' :
                   'Overdue'}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-semibold text-text-primary">
          {formatMonthYear(monthStart)}
        </h2>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handlePreviousMonth}>
            ←
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNextMonth}>
            →
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCurrentMonth}>
            Today
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Spend This Period */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Spend This Period</h3>
            <p className="text-2xl font-bold text-text-primary">
              {formatCurrency(metrics.spendThisPeriod)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {currentMonthTransactions.filter(tx => tx.type === 'EXPENSE').length} purchases
            </p>
          </div>
        </Card>

        {/* Payments Made */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Payments Made</h3>
            <p className="text-2xl font-bold text-positive">
              {formatCurrency(metrics.paymentsThisPeriod)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {currentMonthTransactions.filter(tx => tx.type === 'TRANSFER' && tx.toAccountId === account.id).length} payments
            </p>
          </div>
        </Card>

        {/* Interest Charged */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Interest Charged</h3>
            <p className="text-2xl font-bold text-negative">
              {formatCurrency(metrics.interestCharged)}
            </p>
            <p className="text-xs text-text-muted mt-1">Financing costs</p>
          </div>
        </Card>

        {/* Fees Charged */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Fees Charged</h3>
            <p className="text-2xl font-bold text-negative">
              {formatCurrency(metrics.feesCharged)}
            </p>
            <p className="text-xs text-text-muted mt-1">Annual, late, etc.</p>
          </div>
        </Card>
      </div>

      {/* Refunds */}
      {metrics.refunds > 0 && (
        <div className="mb-6">
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-text-secondary mb-2">Refunds & Chargebacks</h3>
              <p className="text-2xl font-bold text-positive">
                {formatCurrency(metrics.refunds)}
              </p>
              <p className="text-xs text-text-muted mt-1">Reduces spending</p>
            </div>
          </Card>
        </div>
      )}

      {/* Spending Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card title="Spending by Category">
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 10).map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{cat.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">
                      {cat.transactionCount} {cat.transactionCount === 1 ? 'purchase' : 'purchases'}
                    </span>
                    <span className="text-sm font-semibold text-text-primary font-mono">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mt-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-text-primary">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setCurrentView('upload')}
            >
              Import Transactions
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setCurrentView('transactions')}
            >
              View All Transactions
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setCurrentView('trends')}
            >
              View Trends
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
