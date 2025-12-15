import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { testApiKey } from '../../services/claude';
import { exportData, importData, clearAllData, clearTransactions, setLastBackupDate, createAutomaticBackup } from '../../services/storage';
import { AccountManagement } from './AccountManagement';

export const Settings: React.FC = () => {
  const { settings, saveSettings, loadData, budgets, addBudget, removeBudget } = useStore();
  const [apiKey, setApiKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<'success' | 'error' | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetThreshold, setBudgetThreshold] = useState('80');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey || '');
    }
  }, [settings]);

  const handleSaveApiKey = async () => {
    console.log('handleSaveApiKey called');
    if (!settings) {
      console.log('No settings found');
      return;
    }

    console.log('Testing API key...');
    setIsTestingKey(true);
    setKeyTestResult(null);

    try {
      const isValid = await testApiKey(apiKey);
      console.log('API key test result:', isValid);

      if (isValid) {
        setKeyTestResult('success');
        await saveSettings({ ...settings, apiKey });
        console.log('API key saved');
      } else {
        setKeyTestResult('error');
        console.log('API key test failed');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setKeyTestResult('error');
    }

    setIsTestingKey(false);
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackupDate();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      try {
        await importData(text);
        await loadData();
        alert('Data imported successfully!');
      } catch (error) {
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const handleClearTransactions = async () => {
    if (
      !confirm(
        '⚠️ WARNING: This will delete all transactions!\n\n' +
        'Your accounts, settings, budgets, and merchant rules will be kept.\n\n' +
        'Click OK to delete all transactions, or Cancel to abort.'
      )
    ) {
      return;
    }

    await clearTransactions();
    await loadData();
    alert('All transactions have been cleared. You can now re-upload your CSV files.');
  };

  const handleClearData = async () => {
    // First, strongly recommend creating a backup
    if (
      !confirm(
        '⚠️ WARNING: This will permanently delete ALL your data!\n\n' +
        'Would you like to create a backup first? (Recommended)\n\n' +
        'Click OK to create backup, or Cancel to skip.'
      )
    ) {
      // User chose to skip backup - double confirm
      if (
        !confirm(
          '⚠️ FINAL WARNING: You are about to delete all data WITHOUT a backup!\n\n' +
          'This action CANNOT be undone.\n\n' +
          'Click OK to permanently delete all data, or Cancel to abort.'
        )
      ) {
        return;
      }
    } else {
      // Create automatic backup
      await createAutomaticBackup();

      // Now confirm deletion
      if (
        !confirm(
          'Backup created! Now, are you sure you want to clear all data?\n\n' +
          'Click OK to delete all data, or Cancel to keep your data.'
        )
      ) {
        return;
      }
    }

    await clearAllData();
    await loadData();
    alert('All data cleared successfully');
  };

  const handleAddCategory = async () => {
    if (!settings || !newCategory.trim()) return;

    const trimmedCategory = newCategory.trim();
    if (settings.defaultCategories.includes(trimmedCategory)) {
      alert('Category already exists');
      return;
    }

    await saveSettings({
      ...settings,
      defaultCategories: [...settings.defaultCategories, trimmedCategory],
    });
    setNewCategory('');
  };

  const handleRemoveCategory = async (categoryToRemove: string) => {
    if (!settings) return;

    if (!confirm(`Remove "${categoryToRemove}" category? Existing transactions will keep this category.`)) {
      return;
    }

    await saveSettings({
      ...settings,
      defaultCategories: settings.defaultCategories.filter(cat => cat !== categoryToRemove),
    });
  };

  const handleAddBudget = async () => {
    if (!budgetCategory || !budgetLimit) return;

    const limit = parseFloat(budgetLimit);
    const threshold = parseFloat(budgetThreshold);

    if (isNaN(limit) || limit <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      alert('Alert threshold must be between 0 and 100');
      return;
    }

    // Check if budget already exists for this category
    const existing = budgets.find(b => b.category === budgetCategory);
    if (existing) {
      if (!confirm(`A budget already exists for ${budgetCategory}. Replace it?`)) {
        return;
      }
    }

    await addBudget({
      id: existing?.id || `budget-${Date.now()}`,
      category: budgetCategory,
      monthlyLimit: limit,
      alertThreshold: threshold,
      createdAt: new Date().toISOString(),
    });

    setBudgetCategory('');
    setBudgetLimit('');
    setBudgetThreshold('80');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-6 text-text-primary">Settings</h1>

      <div className="space-y-6">
        <AccountManagement />

        <Card title="Claude API Configuration">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveApiKey()}
                  placeholder="sk-ant-..."
                  autoComplete="new-password"
                  data-form-type="other"
                  data-lpignore="true"
                  name="anthropic-api-key"
                  id="anthropic-api-key"
                  className="w-full px-4 py-2 pr-10 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Your API key is stored locally in your browser and never sent to any server
                except Anthropic's API.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveApiKey} disabled={isTestingKey || !apiKey}>
                {isTestingKey ? 'Testing...' : 'Save & Test API Key'}
              </Button>

              {keyTestResult === 'success' && (
                <span className="text-positive text-sm">✓ API key is valid</span>
              )}
              {keyTestResult === 'error' && (
                <span className="text-negative text-sm">✗ API key test failed</span>
              )}
            </div>
          </div>
        </Card>

        <Card title="Categories">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">Manage your transaction categories:</p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="New category name..."
                className="flex-1 px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                Add Category
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings?.defaultCategories.map((category) => (
                <div
                  key={category}
                  className="group flex items-center gap-2 px-3 py-1 bg-primary/20 backdrop-blur-sm text-primary rounded border border-primary/30 hover:border-primary transition-all"
                >
                  <span className="text-sm font-medium">{category}</span>
                  <button
                    onClick={() => handleRemoveCategory(category)}
                    className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary-light transition-all"
                    title="Remove category"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Monthly Budgets">
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">Set spending limits for categories and get alerts:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="">Select category...</option>
                {settings?.defaultCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="Monthly limit ($)"
                className="px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  value={budgetThreshold}
                  onChange={(e) => setBudgetThreshold(e.target.value)}
                  placeholder="Alert at %"
                  min="0"
                  max="100"
                  className="flex-1 px-4 py-2 bg-background-alt/50 backdrop-blur-sm border border-border rounded text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <span className="flex items-center text-text-secondary text-sm">%</span>
              </div>
            </div>

            <Button onClick={handleAddBudget} disabled={!budgetCategory || !budgetLimit}>
              Add Budget
            </Button>

            {budgets.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium text-text-secondary">Active Budgets:</h4>
                {budgets.map((budget) => (
                  <div
                    key={budget.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-text-primary">{budget.category}</span>
                        <span className="text-text-secondary text-sm">
                          ${budget.monthlyLimit.toFixed(2)}/month
                        </span>
                        <span className="text-xs text-text-tertiary">
                          Alert at {budget.alertThreshold}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBudget(budget.id)}
                      className="text-negative hover:text-red-400 transition-colors"
                      title="Remove budget"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Data Management">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-text-primary mb-2">Export Data</h4>
              <p className="text-sm text-text-secondary mb-3">
                Download all your data as a JSON backup file
              </p>
              <Button variant="secondary" onClick={handleExport}>
                Export Data
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-text-primary mb-2">Import Data</h4>
              <p className="text-sm text-text-secondary mb-3">
                Restore data from a previously exported JSON file
              </p>
              <Button variant="secondary" onClick={handleImport}>
                Import Data
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-text-primary mb-2">Clear Transactions Only</h4>
              <p className="text-sm text-text-secondary mb-3">
                Delete all transactions while keeping accounts, settings, budgets, and merchant rules.
              </p>
              <Button variant="secondary" onClick={handleClearTransactions}>
                Clear Transactions
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-negative mb-2">Clear All Data</h4>
              <p className="text-sm text-text-secondary mb-3">
                Permanently delete all transactions, budgets, and settings. This cannot be undone.
              </p>
              <Button variant="danger" onClick={handleClearData}>
                Clear All Data
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Display Preferences">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Currency
              </label>
              <input
                type="text"
                value={settings?.currency || 'CAD'}
                disabled
                className="px-4 py-2 bg-background border border-border rounded text-text-primary opacity-50"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
