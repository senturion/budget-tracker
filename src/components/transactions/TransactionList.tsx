import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterTransactionsByAccount } from '../../utils/accountFilters';
import type { Transaction } from '../../types';
import { updateTransaction as updateTransactionInDb, addMerchantRule, updateMerchantInAllTransactions } from '../../services/storage';
import { categorizeTransactions } from '../../services/claude';

export const TransactionList: React.FC = () => {
  const { transactions, selectedAccountId, transactionCategoryFilter, transactionTypeFilter, setTransactionCategoryFilter, setTransactionTypeFilter, updateTransaction, settings, loadData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingMerchant, setEditingMerchant] = useState(false);
  const [editingType, setEditingType] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [recategorizeStatus, setRecategorizeStatus] = useState<string>('');
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const accountFilteredTransactions = useMemo(
    () => filterTransactionsByAccount(transactions, selectedAccountId),
    [transactions, selectedAccountId]
  );

  const categories = useMemo(() => {
    const cats = new Set(
      accountFilteredTransactions
        .map((tx) => tx.category)
        .filter((cat): cat is string => cat !== null)
    );
    return Array.from(cats).sort();
  }, [accountFilteredTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = accountFilteredTransactions;

    // Filter by selected month
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    filtered = filtered.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    if (searchTerm) {
      filtered = filtered.filter(
        (tx) =>
          tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.merchant.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (transactionCategoryFilter) {
      filtered = filtered.filter((tx) => tx.category === transactionCategoryFilter);
    }

    if (transactionTypeFilter) {
      filtered = filtered.filter((tx) => tx.type === transactionTypeFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else {
        aVal = a.amount;
        bVal = b.amount;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [accountFilteredTransactions, searchTerm, transactionCategoryFilter, transactionTypeFilter, sortField, sortDirection, selectedMonth]);

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() === now.getFullYear() &&
           selectedMonth.getMonth() === now.getMonth();
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!editingTransaction) return;

    const updates = {
      category: newCategory,
      categorySource: 'manual' as const,
    };

    await updateTransactionInDb(editingTransaction.id, updates);
    updateTransaction(editingTransaction.id, updates);

    // Create a merchant rule so future transactions from this merchant are auto-categorized
    await addMerchantRule({
      pattern: editingTransaction.merchant,
      category: newCategory,
      createdAt: new Date().toISOString(),
    });

    setEditingTransaction(null);
  };

  const handleStartMerchantEdit = () => {
    if (!editingTransaction) return;
    setNewMerchantName(editingTransaction.merchant);
    setEditingMerchant(true);
  };

  const handleSaveMerchantName = async () => {
    if (!editingTransaction || !newMerchantName.trim()) return;

    const oldMerchant = editingTransaction.merchant;
    const trimmedName = newMerchantName.trim();

    // Update all transactions with this merchant
    await updateMerchantInAllTransactions(oldMerchant, trimmedName);

    // Reload data to reflect changes
    await loadData();

    setEditingMerchant(false);
    setEditingTransaction(null);
  };

  const handleCancelMerchantEdit = () => {
    setEditingMerchant(false);
    setNewMerchantName('');
  };

  const handleStartTypeEdit = () => {
    setEditingType(true);
  };

  const handleTypeChange = async (newType: string) => {
    if (!editingTransaction) return;

    const updates: Partial<Transaction> = {
      type: newType as any,
    };

    // If changing to TRANSFER or ADJUSTMENT, set affectsBudget to false
    if (newType === 'TRANSFER' || newType === 'ADJUSTMENT') {
      updates.affectsBudget = false;
    } else {
      updates.affectsBudget = true;
    }

    await updateTransactionInDb(editingTransaction.id, updates);
    updateTransaction(editingTransaction.id, updates);

    setEditingType(false);
    setEditingTransaction(null);
  };

  const handleCancelTypeEdit = () => {
    setEditingType(false);
  };

  const handleToggleTransaction = (txId: string) => {
    const newSelected = new Set(selectedTransactionIds);
    if (newSelected.has(txId)) {
      newSelected.delete(txId);
    } else {
      newSelected.add(txId);
    }
    setSelectedTransactionIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactionIds.size === filteredTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };

  const handleBulkTypeChange = async (newType: string) => {
    const updates: Partial<Transaction> = {
      type: newType as any,
    };

    if (newType === 'TRANSFER' || newType === 'ADJUSTMENT') {
      updates.affectsBudget = false;
    } else {
      updates.affectsBudget = true;
    }

    try {
      // Update all transactions in database first (in parallel)
      await Promise.all(
        Array.from(selectedTransactionIds).map(txId =>
          updateTransactionInDb(txId, updates)
        )
      );

      // Only update store after all DB updates succeed
      selectedTransactionIds.forEach(txId => {
        updateTransaction(txId, updates);
      });

      setSelectedTransactionIds(new Set());
      setShowBulkEditModal(false);
    } catch (error) {
      alert(`Failed to update transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkCategoryChange = async (newCategory: string) => {
    const updates = {
      category: newCategory,
      categorySource: 'manual' as const,
    };

    try {
      // Update all transactions in database first (in parallel)
      await Promise.all(
        Array.from(selectedTransactionIds).map(txId =>
          updateTransactionInDb(txId, updates)
        )
      );

      // Only update store after all DB updates succeed
      selectedTransactionIds.forEach(txId => {
        updateTransaction(txId, updates);
      });

      setSelectedTransactionIds(new Set());
      setShowBulkEditModal(false);
    } catch (error) {
      alert(`Failed to update transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRecategorizeAll = async () => {
    if (!settings?.apiKey) {
      setRecategorizeStatus('⚠️ No API key configured. Please add one in Settings.');
      return;
    }

    if (!confirm('This will recategorize all transactions using AI. Continue?')) {
      return;
    }

    setIsRecategorizing(true);
    setRecategorizeStatus('Starting AI recategorization...');

    try {
      // Get all transactions that need categorization (excluding payments)
      const txToRecategorize = transactions.filter(tx => tx.amount > 0);

      if (txToRecategorize.length === 0) {
        setRecategorizeStatus('No transactions to categorize.');
        setIsRecategorizing(false);
        return;
      }

      // Process in batches of 50 to avoid overwhelming the API
      const batchSize = 50;
      let categorizedCount = 0;
      const categories = settings.defaultCategories;

      for (let i = 0; i < txToRecategorize.length; i += batchSize) {
        const batch = txToRecategorize.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(txToRecategorize.length / batchSize);

        setRecategorizeStatus(
          `Categorizing batch ${batchNum}/${totalBatches} (${batch.length} transactions)...`
        );

        try {
          const categorizations = await categorizeTransactions(
            settings.apiKey,
            batch
          );

          // Apply categorizations for this batch
          for (const tx of batch) {
            const result = categorizations[tx.description];
            if (result && result.category && result.category !== tx.category) {
              const updates: Partial<Transaction> = {
                category: result.category,
                categorySource: 'ai' as const,
              };

              // Update incomeClass if this is an INFLOW transaction
              if (tx.type === 'INFLOW' && result.incomeClass) {
                updates.incomeClass = result.incomeClass;
              }

              await updateTransactionInDb(tx.id, updates);
              updateTransaction(tx.id, updates);
              categorizedCount++;

              // Create/update merchant rule
              await addMerchantRule({
                pattern: tx.merchant,
                category: result.category,
                createdAt: new Date().toISOString(),
              });
            }
          }
        } catch (batchError) {
          console.error(`Batch ${batchNum} failed:`, batchError);
          setRecategorizeStatus(`⚠️ Batch ${batchNum} failed, continuing with next batch...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setRecategorizeStatus(`✓ Successfully recategorized ${categorizedCount} transactions!`);
      setTimeout(() => setRecategorizeStatus(''), 5000);
    } catch (error) {
      console.error('Recategorization failed:', error);
      setRecategorizeStatus(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRecategorizing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-6 text-text-primary">Transactions</h1>

      <Card className="mb-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePreviousMonth}
              variant="secondary"
              className="px-3 py-2"
            >
              ← Prev
            </Button>
            <div className="px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary font-medium min-w-[200px] text-center">
              {formatMonthYear(selectedMonth)}
            </div>
            <Button
              onClick={handleNextMonth}
              variant="secondary"
              className="px-3 py-2"
            >
              Next →
            </Button>
          </div>
          {!isCurrentMonth() && (
            <Button
              onClick={handleCurrentMonth}
              variant="primary"
              className="px-4 py-2"
            >
              Current Month
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          <select
            value={transactionCategoryFilter || ''}
            onChange={(e) => setTransactionCategoryFilter(e.target.value || null)}
            className="px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={transactionTypeFilter || ''}
            onChange={(e) => setTransactionTypeFilter(e.target.value || null)}
            className="px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          >
            <option value="">All Types</option>
            <option value="EXPENSE">Expenses</option>
            <option value="INFLOW">Income/Payments</option>
            <option value="TRANSFER">Transfers</option>
            <option value="ADJUSTMENT">Adjustments</option>
          </select>
          <Button
            onClick={handleRecategorizeAll}
            disabled={isRecategorizing}
            variant="secondary"
          >
            {isRecategorizing ? 'Categorizing...' : 'Recategorize All with AI'}
          </Button>
          {selectedTransactionIds.size > 0 && (
            <Button
              onClick={() => setShowBulkEditModal(true)}
              variant="primary"
            >
              Edit {selectedTransactionIds.size} Selected
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            Showing {filteredTransactions.length} of {transactions.length} transactions
            {selectedTransactionIds.size > 0 && ` · ${selectedTransactionIds.size} selected`}
          </div>
          {recategorizeStatus && (
            <div className="text-sm text-text-primary">
              {recategorizeStatus}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-2 w-10">
                  <input
                    type="checkbox"
                    checked={selectedTransactionIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </th>
                <th
                  className="text-left py-3 px-2 text-text-secondary cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-2 text-text-secondary">Description</th>
                <th className="text-left py-3 px-2 text-text-secondary">Category</th>
                <th
                  className="text-right py-3 px-2 text-text-secondary cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selectedTransactionIds.has(tx.id)}
                      onChange={() => handleToggleTransaction(tx.id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="py-3 px-2 text-text-primary">{formatDate(tx.date)}</td>
                  <td className="py-3 px-2">
                    <div className="text-text-primary">{tx.description}</div>
                    <div className="text-xs text-text-secondary">{tx.merchant}</div>
                  </td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => setEditingTransaction(tx)}
                      className="px-3 py-1 rounded text-xs bg-primary/20 backdrop-blur-sm text-primary hover:bg-primary hover:text-background-alt hover:shadow-glow-md transition-all duration-200 cursor-pointer font-medium border border-primary/30 hover:border-primary"
                      title="Click to change category"
                    >
                      {tx.category}
                    </button>
                  </td>
                  <td
                    className={`py-3 px-2 text-right font-mono ${
                      tx.amount > 0 ? 'text-text-primary' : 'text-positive'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={!!editingTransaction}
        onClose={() => {
          setEditingTransaction(null);
          setEditingMerchant(false);
          setEditingType(false);
        }}
        title={editingMerchant ? "Rename Merchant" : editingType ? "Change Transaction Type" : "Change Category"}
      >
        {editingTransaction && (
          <div>
            {editingType ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-secondary mb-2">Current Type</p>
                  <p className="text-text-primary font-medium">{editingTransaction.type}</p>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-3">Select Transaction Type:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={editingTransaction.type === 'EXPENSE' ? 'primary' : 'secondary'}
                      onClick={() => handleTypeChange('EXPENSE')}
                    >
                      Expense
                    </Button>
                    <Button
                      variant={editingTransaction.type === 'INFLOW' ? 'primary' : 'secondary'}
                      onClick={() => handleTypeChange('INFLOW')}
                    >
                      Income/Payment
                    </Button>
                    <Button
                      variant={editingTransaction.type === 'TRANSFER' ? 'primary' : 'secondary'}
                      onClick={() => handleTypeChange('TRANSFER')}
                    >
                      Transfer
                    </Button>
                    <Button
                      variant={editingTransaction.type === 'ADJUSTMENT' ? 'primary' : 'secondary'}
                      onClick={() => handleTypeChange('ADJUSTMENT')}
                    >
                      Adjustment
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted mt-3">
                    • <strong>Expense:</strong> Spending that affects your budget<br />
                    • <strong>Income/Payment:</strong> Money received (salary, refunds, etc.)<br />
                    • <strong>Transfer:</strong> Moving money between accounts (net-zero)<br />
                    • <strong>Adjustment:</strong> Balance corrections (doesn't affect net worth)
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCancelTypeEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : editingMerchant ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-secondary mb-2">Current Name</p>
                  <p className="text-text-primary font-medium">{editingTransaction.merchant}</p>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">New Merchant Name</label>
                  <input
                    type="text"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveMerchantName();
                      if (e.key === 'Escape') handleCancelMerchantEdit();
                    }}
                    className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter new merchant name"
                    autoFocus
                  />
                  <p className="text-xs text-text-muted mt-2">
                    This will update all transactions from this merchant
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveMerchantName} disabled={!newMerchantName.trim()}>
                    Save Changes
                  </Button>
                  <Button variant="secondary" onClick={handleCancelMerchantEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-sm text-text-secondary mb-1">Transaction</p>
                  <p className="text-text-primary font-medium">{editingTransaction.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-text-secondary">Merchant: {editingTransaction.merchant}</p>
                    <button
                      onClick={handleStartMerchantEdit}
                      className="text-xs text-primary hover:text-primary/80 underline"
                    >
                      Rename
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-text-secondary">Type: {editingTransaction.type}</p>
                    <button
                      onClick={handleStartTypeEdit}
                      className="text-xs text-primary hover:text-primary/80 underline"
                    >
                      Change Type
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-text-secondary mb-3">Select a category:</p>
                </div>
              </>
            )}
            {!editingMerchant && !editingType && (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {(settings?.defaultCategories || []).map((category) => (
                  <Button
                    key={category}
                    variant={
                      editingTransaction.category === category ? 'primary' : 'secondary'
                    }
                    onClick={() => handleCategoryChange(category)}
                    className="justify-start text-left"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary mt-4 italic">
              💡 Tip: This will create a rule to auto-categorize future transactions from this merchant
            </p>
          </div>
        )}
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        title={`Edit ${selectedTransactionIds.size} Transactions`}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Change Transaction Type</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={() => handleBulkTypeChange('EXPENSE')}
              >
                Set as Expense
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBulkTypeChange('INFLOW')}
              >
                Set as Income
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBulkTypeChange('TRANSFER')}
              >
                Set as Transfer
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBulkTypeChange('ADJUSTMENT')}
              >
                Set as Adjustment
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Change Category</h3>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {(settings?.defaultCategories || []).map((category) => (
                <Button
                  key={category}
                  variant="secondary"
                  onClick={() => handleBulkCategoryChange(category)}
                  className="justify-start text-left"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-6 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowBulkEditModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
