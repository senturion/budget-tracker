import React, { useState, useCallback } from 'react';
import { Card } from '../common/Card';
import { parseCSV, detectDuplicates } from '../../services/csvParser';
import { categorizeTransactions } from '../../services/claude';
import { addTransactions, addMerchantRule, findMerchantRule } from '../../services/storage';
import { useStore } from '../../store';
import type { Transaction } from '../../types';

export const UploadZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [uploadAccountId, setUploadAccountId] = useState<string | null>(null);

  const { settings, transactions, accounts, budgets, addTransactions: addToStore, loadData } = useStore();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setStatus('Please upload a CSV file');
      return;
    }

    // Check if we have a valid account selected
    const accountId = uploadAccountId || accounts.find(a => a.isDefault)?.id || accounts[0]?.id;

    if (!accountId) {
      setStatus('Please create an account first in Settings');
      return;
    }

    setIsProcessing(true);
    setStatus('Parsing CSV file...');

    try {
      // Parse CSV
      const { transactions: parsedTransactions, errors } = await parseCSV(file, accountId);

      if (errors.length > 0) {
        console.warn('CSV parsing errors:', errors);
      }

      if (parsedTransactions.length === 0) {
        setStatus('No transactions found in CSV');
        setIsProcessing(false);
        return;
      }

      // Check for duplicates
      const { unique, duplicates } = detectDuplicates(parsedTransactions, transactions);

      setStatus(
        `Found ${unique.length} new transactions${duplicates.length > 0 ? `, ${duplicates.length} duplicates skipped` : ''}`
      );

      if (unique.length === 0) {
        setIsProcessing(false);
        return;
      }

      // Apply merchant rules
      setStatus('Checking merchant rules...');
      const uncategorized: Transaction[] = [];

      for (const tx of unique) {
        const ruleCategory = await findMerchantRule(tx.description);
        if (ruleCategory) {
          tx.category = ruleCategory;
          tx.categorySource = 'rule';
        } else {
          uncategorized.push(tx);
        }
      }

      // Categorize with AI if API key is available
      if (uncategorized.length > 0) {
        if (!settings?.apiKey) {
          setStatus(`⚠️ No API key configured. ${uncategorized.length} transactions need categorization. Add API key in Settings to enable AI categorization.`);
        } else {
          setStatus(`Categorizing ${uncategorized.length} transactions with AI...`);

          try {
            // Get categories from settings (user's custom categories)
            const userCategories = settings.defaultCategories && settings.defaultCategories.length > 0 ? {
              expense: settings.defaultCategories.filter(c => !c.startsWith('Income:')),
              income: settings.defaultCategories.filter(c => c.startsWith('Income:'))
            } : undefined;

            const categorizations = await categorizeTransactions(
              settings.apiKey,
              uncategorized,
              userCategories
            );

            // Apply categorizations and create merchant rules
            let categorizedCount = 0;
            for (const tx of uncategorized) {
              const result = categorizations[tx.description];
              if (result) {
                // Update transaction type if AI detected a different type
                if (result.transactionType) {
                  tx.type = result.transactionType;
                  // TRANSFER and ADJUSTMENT don't have categories and don't affect budget
                  if (result.transactionType === 'TRANSFER' || result.transactionType === 'ADJUSTMENT') {
                    tx.category = null;
                    tx.affectsBudget = false;
                  }
                }

                // Set category if provided
                if (result.category) {
                  tx.category = result.category;
                  tx.categorySource = 'ai';
                }

                // Set income class for INFLOW transactions
                if (result.incomeClass) {
                  tx.incomeClass = result.incomeClass;
                }

                categorizedCount++;

                // Create merchant rule for future use
                try {
                  await addMerchantRule({
                    pattern: tx.merchant,
                    category: result.category,
                    createdAt: new Date().toISOString(),
                  });
                } catch (ruleError) {
                  console.error('Failed to create merchant rule:', ruleError);
                  // Continue processing - merchant rule creation failure shouldn't block import
                }
              }
            }

            setStatus(`✓ AI categorized ${categorizedCount} of ${uncategorized.length} transactions`);
          } catch (error) {
            console.error('AI categorization failed:', error);
            setStatus(`❌ AI categorization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Transactions will need manual categorization.`);
          }
        }
      }

      // Save transactions
      setStatus('Saving transactions...');
      try {
        await addTransactions(unique);
        addToStore(unique);

        setStatus(`Successfully imported ${unique.length} transactions!`);
        setPreview(unique.slice(0, 10));
        setIsProcessing(false);

        // Reload data to refresh merchant rules
        try {
          await loadData();
        } catch (loadError) {
          console.error('Failed to reload data after import:', loadError);
          // Data is already saved, so this is not critical
        }
      } catch (saveError) {
        console.error('Failed to save transactions:', saveError);
        setStatus(`❌ Failed to save transactions: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const uploadTargetAccount = uploadAccountId
    ? accounts.find(a => a.id === uploadAccountId)
    : accounts.find(a => a.isDefault) || accounts[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-text-primary">Import Transactions</h1>
        {accounts.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Select Account for Import
            </label>
            <p className="text-xs text-text-muted mb-2">
              Choose which account these transactions belong to
            </p>
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setUploadAccountId(account.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    uploadAccountId === account.id || (!uploadAccountId && account.isDefault)
                      ? 'bg-primary text-background-alt shadow-glow-sm'
                      : 'bg-muted text-text-secondary hover:bg-muted/80 hover:text-text-primary'
                  }`}
                  style={{
                    borderLeft: `4px solid ${account.color}`,
                  }}
                >
                  {account.name}
                  {account.isDefault && !uploadAccountId && (
                    <span className="ml-1 text-xs opacity-75">(default)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {uploadTargetAccount && (
          <p className="text-sm text-text-secondary mt-4">
            Importing to: <span className="text-text-primary font-medium">{uploadTargetAccount.name}</span>
          </p>
        )}
      </div>

      <Card>
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
            isDragging
              ? 'border-primary bg-primary/20 shadow-glow-md'
              : 'border-border hover:border-primary/50 hover:bg-muted/20'
          }`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-16 h-16 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="text-lg text-text-primary mb-2">
                Drag and drop your CSV file here, or
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isProcessing}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <label
                htmlFor="file-upload"
                className={`inline-block px-4 py-2 rounded font-medium transition-all duration-200 cursor-pointer ${
                  isProcessing
                    ? 'opacity-50 cursor-not-allowed bg-primary text-background-alt'
                    : 'bg-primary text-background-alt hover:bg-primary-light hover:shadow-glow-md font-display'
                }`}
              >
                Choose File
              </label>
            </div>
            <p className="text-sm text-text-secondary">
              Expected format: date, description, charge, credit, balance
            </p>
          </div>
        </div>

        {status && (
          <div className="mt-4 p-4 bg-muted/50 backdrop-blur-sm border border-border rounded">
            <p className="text-text-primary">{status}</p>
            {isProcessing && (
              <div className="mt-2 w-full bg-background-alt rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full animate-pulse w-1/2 shadow-glow-sm"></div>
              </div>
            )}
          </div>
        )}

        {preview.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-text-primary">
              Preview (first 10 transactions)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary">Date</th>
                    <th className="text-left py-2 text-text-secondary">Description</th>
                    <th className="text-left py-2 text-text-secondary">Category</th>
                    <th className="text-right py-2 text-text-secondary">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((tx) => (
                    <tr key={tx.id} className="border-b border-border">
                      <td className="py-2 text-text-primary">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-text-primary">{tx.description}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded text-xs bg-primary bg-opacity-20 text-primary">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-text-primary">
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
