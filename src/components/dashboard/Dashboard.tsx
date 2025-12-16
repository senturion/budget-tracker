import React, { useMemo } from 'react';
import { useStore } from '../../store';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { SpendingBreakdown } from './SpendingBreakdown';
import { IncomeBreakdown } from './IncomeBreakdown';
import { BudgetCard } from './BudgetCard';
import { BudgetAlerts } from './BudgetAlerts';
import { calculateFinancialSummary, getExpenseCategories } from '../../utils/financialCalculations';
import { calculateAllBudgetStatuses } from '../../utils/budgetCalculations';
import { getMonthStart, getMonthEnd, formatMonthYear, getPreviousMonth, formatCurrency } from '../../utils/formatters';
import { filterTransactionsByAccount } from '../../utils/accountFilters';
import { Button } from '../common/Button';
import type { CategorySpending } from '../../types';

export const Dashboard: React.FC = () => {
  const { transactions, budgets, selectedMonth, selectedAccountId, accounts, setSelectedMonth, setCurrentView } = useStore();

  const filteredTransactions = useMemo(
    () => filterTransactionsByAccount(transactions, selectedAccountId),
    [transactions, selectedAccountId]
  );

  const currentAccount = useMemo(
    () => selectedAccountId !== 'all' ? accounts.find(a => a.id === selectedAccountId) : undefined,
    [selectedAccountId, accounts]
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

  const previousMonthDates = useMemo(() => getPreviousMonth(monthStart), [monthStart]);

  const previousMonthTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (tx) =>
          new Date(tx.date) >= new Date(previousMonthDates.start) &&
          new Date(tx.date) <= new Date(previousMonthDates.end)
      ),
    [filteredTransactions, previousMonthDates]
  );

  const summary = useMemo(() => {
    console.log('Dashboard Debug:', {
      totalTransactions: currentMonthTransactions.length,
      sampleTransactions: currentMonthTransactions.slice(0, 3).map(t => ({
        description: t.description,
        type: t.type,
        amount: t.amount,
        category: t.category,
        affectsBudget: t.affectsBudget,
        incomeClass: t.incomeClass
      }))
    });

    return calculateFinancialSummary(currentMonthTransactions);
  }, [currentMonthTransactions]);

  const previousSummary = useMemo(
    () => calculateFinancialSummary(previousMonthTransactions),
    [previousMonthTransactions]
  );

  const previousPeriodChange = useMemo(() => {
    if (previousSummary.expenses.total === 0) return undefined;
    return ((summary.expenses.total - previousSummary.expenses.total) / previousSummary.expenses.total) * 100;
  }, [summary.expenses.total, previousSummary.expenses.total]);

  const categoryBreakdown: CategorySpending[] = useMemo(
    () => getExpenseCategories(currentMonthTransactions),
    [currentMonthTransactions]
  );

  const budgetStatuses = useMemo(
    () => calculateAllBudgetStatuses(budgets, transactions, selectedMonth),
    [budgets, transactions, selectedMonth]
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

  const handleCategoryClick = () => {
    setCurrentView('transactions');
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-text-primary">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handlePreviousMonth}>
            ←
          </Button>
          <span className="text-text-primary font-display font-medium min-w-[150px] text-center">
            {formatMonthYear(monthStart)}
          </span>
          <Button variant="secondary" size="sm" onClick={handleNextMonth}>
            →
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCurrentMonth}>
            Today
          </Button>
        </div>
      </div>

      <BudgetAlerts budgetStatuses={budgetStatuses} />

      <FinancialSummaryCards
        summary={summary}
        previousPeriodChange={previousPeriodChange}
        account={currentAccount}
      />

      {budgetStatuses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-display font-semibold mb-4 text-text-primary">Monthly Budgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetStatuses.map((status) => (
              <BudgetCard key={status.budget.id} budgetStatus={status} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SpendingBreakdown
          categories={categoryBreakdown}
          budgetStatuses={budgetStatuses}
          onCategoryClick={handleCategoryClick}
        />
        <IncomeBreakdown transactions={currentMonthTransactions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Quick Actions</h3>
            <div className="space-y-2">
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
                onClick={() => setCurrentView('settings')}
              >
                Settings
              </Button>
            </div>
          </div>

          {categoryBreakdown.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-text-primary">Top Categories</h3>
              <div className="space-y-3">
                {categoryBreakdown.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">{cat.category}</span>
                    <span className="text-text-primary font-mono text-sm font-semibold">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
