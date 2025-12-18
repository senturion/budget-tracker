import React, { useMemo } from 'react';
import { useStore } from '../../store';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { calculateBankAccountMetrics } from '../../utils/accountMetrics';
import { getMonthStart, getMonthEnd, formatMonthYear, formatCurrency } from '../../utils/formatters';
import { filterTransactionsByAccount } from '../../utils/accountFilters';
import { getExpenseCategories } from '../../utils/financialCalculations';
import type { BankAccount, CategorySpending } from '../../types';

interface BankAccountDashboardProps {
  account: BankAccount;
}

export const BankAccountDashboard: React.FC<BankAccountDashboardProps> = ({ account }) => {
  console.log('BankAccountDashboard: Rendering with account', account);
  const { transactions, selectedMonth, setSelectedMonth, setCurrentView, setTransactionCategoryFilter, setTransactionTypeFilter } = useStore();
  console.log('BankAccountDashboard: transactions count', transactions.length);

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
    () => calculateBankAccountMetrics(account, currentMonthTransactions),
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

  const handleCategoryClick = (category: string) => {
    setTransactionCategoryFilter(category);
    setTransactionTypeFilter(null);
    setCurrentView('transactions');
  };

  const subtypeLabel = account.subtype
    ? account.subtype.charAt(0) + account.subtype.slice(1).toLowerCase()
    : 'Bank Account';

  if (transactions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-3xl font-display font-bold mb-4 text-text-primary">Welcome to Budget Tracker</h1>
        <p className="text-text-secondary mb-6">
          Get started by importing your transactions
        </p>
        <Button onClick={() => setCurrentView('upload')}>Import Transactions</Button>
      </div>
    );
  }

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
              {account.institution ? `${account.institution} • ` : ''}
              {subtypeLabel}
            </p>
          </div>
        </div>

        {/* Balance Info */}
        {metrics.currentBalance !== undefined && (
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-sm text-text-secondary">Current Balance</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatCurrency(metrics.currentBalance)}
              </p>
            </div>
            {metrics.availableBalance !== undefined && (
              <div>
                <p className="text-sm text-text-secondary">Available Balance</p>
                <p className="text-2xl font-bold text-text-primary">
                  {formatCurrency(metrics.availableBalance)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Net Cash Flow */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Net Cash Flow</h3>
            <p className={`text-3xl font-bold ${metrics.netCashFlow >= 0 ? 'text-positive' : 'text-negative'}`}>
              {metrics.netCashFlow >= 0 ? '+' : ''}
              {formatCurrency(metrics.netCashFlow)}
            </p>
            <p className="text-xs text-text-muted mt-1">Income - Spending</p>
          </div>
        </Card>

        {/* Total Income */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Total Income</h3>
            <p className="text-3xl font-bold text-text-primary">
              {formatCurrency(metrics.totalIncome)}
            </p>
            <div className="text-xs text-text-muted mt-1">
              <span className="text-positive">
                Earned: {formatCurrency(metrics.earnedIncome)}
              </span>
              {' • '}
              <span>Passive: {formatCurrency(metrics.passiveIncome)}</span>
            </div>
          </div>
        </Card>

        {/* Total Spending */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Total Spending</h3>
            <p className="text-3xl font-bold text-text-primary">
              {formatCurrency(metrics.totalSpending)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {currentMonthTransactions.filter(tx => tx.type === 'EXPENSE').length} expenses
            </p>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      {(metrics.reimbursements > 0 || metrics.transfers > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {metrics.reimbursements > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="text-sm font-medium text-text-secondary mb-2">Reimbursements</h3>
                <p className="text-xl font-bold text-positive">
                  {formatCurrency(metrics.reimbursements)}
                </p>
                <p className="text-xs text-text-muted mt-1">Refunds & returns</p>
              </div>
            </Card>
          )}
          {metrics.transfers > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="text-sm font-medium text-text-secondary mb-2">Transfers</h3>
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(metrics.transfers)}
                </p>
                <p className="text-xs text-text-muted mt-1">Money moved between accounts</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Spending Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card title="Spending by Category">
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 10).map((cat) => (
              <div
                key={cat.category}
                className="cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-lg transition-colors"
                onClick={() => handleCategoryClick(cat.category)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{cat.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">
                      {cat.transactionCount} {cat.transactionCount === 1 ? 'transaction' : 'transactions'}
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
