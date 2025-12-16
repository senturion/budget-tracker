import Dexie, { type Table } from 'dexie';
import type { Transaction, MerchantRule, Budget, AppSettings, Account } from '../types';
import { TransactionType, IncomeClass } from '../types';

class BudgetTrackerDatabase extends Dexie {
  transactions!: Table<Transaction>;
  merchantRules!: Table<MerchantRule>;
  budgets!: Table<Budget>;
  settings!: Table<AppSettings & { id: number }>;
  accounts!: Table<Account>;

  constructor() {
    super('BudgetTrackerDB');
    this.version(1).stores({
      transactions: 'id, date, category, merchant, amount, importedAt',
      merchantRules: '++id, pattern, category',
      budgets: 'category, monthlyLimit',
      settings: 'id',
    });
    // Update schema to use id as primary key for budgets
    this.version(2)
      .stores({
        transactions: 'id, date, category, merchant, amount, importedAt',
        merchantRules: '++id, pattern, category',
        budgets: 'id, category',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        // Migrate existing budgets from v1 to v2
        // This ensures old budgets get proper IDs
        const oldBudgets = await tx.table('budgets').toArray();
        if (oldBudgets.length > 0) {
          // Clear and re-add with new schema
          await tx.table('budgets').clear();
          const migratedBudgets = oldBudgets.map((budget: any) => ({
            id: `budget-${budget.category}-${Date.now()}`,
            category: budget.category,
            monthlyLimit: budget.monthlyLimit,
            alertThreshold: budget.alertThreshold || 80,
            createdAt: budget.createdAt || new Date().toISOString(),
          }));
          await tx.table('budgets').bulkAdd(migratedBudgets);
        }
      });
    // Add accounts table and accountId to transactions
    this.version(3)
      .stores({
        transactions: 'id, accountId, date, category, merchant, amount, importedAt',
        merchantRules: '++id, pattern, category',
        budgets: 'id, category, accountId',
        settings: 'id',
        accounts: 'id, name, isDefault',
      })
      .upgrade(async (tx) => {
        // Create default account for existing data
        const defaultAccount: Account = {
          id: 'default-account',
          name: 'Default Account',
          type: 'credit',
          color: '#f59e0b',
          isDefault: true,
          createdAt: new Date().toISOString(),
        };

        await tx.table('accounts').add(defaultAccount);

        // Migrate existing transactions to default account
        const transactions = await tx.table('transactions').toArray();
        if (transactions.length > 0) {
          for (const transaction of transactions) {
            await tx.table('transactions').update(transaction.id, {
              accountId: 'default-account',
            });
          }
        }
      });

    // Add transaction type system and proper money movement tracking
    this.version(4)
      .stores({
        transactions: 'id, accountId, toAccountId, type, date, category, merchant, amount, importedAt, affectsBudget',
        merchantRules: '++id, pattern, category',
        budgets: 'id, category, accountId',
        settings: 'id',
        accounts: 'id, name, isDefault',
      })
      .upgrade(async (tx) => {
        // Migrate existing transactions to new model
        const transactions = await tx.table('transactions').toArray();

        for (const transaction of transactions) {
          const updates: Partial<Transaction> = {
            // Determine transaction type based on amount and category
            type: transaction.amount < 0 ? TransactionType.INFLOW : TransactionType.EXPENSE,

            // Make amount always positive
            amount: Math.abs(transaction.amount),

            // Set budget impact (true for expenses and income)
            affectsBudget: true,

            // Set category to null if it was 'Uncategorized'
            category: transaction.category === 'Uncategorized' ? null : transaction.category,
          };

          // If this is an inflow (was negative amount), determine income class
          if (transaction.amount < 0) {
            // Try to infer income class from category
            const category = transaction.category?.toLowerCase() || '';
            if (category.includes('salary') || category.includes('wage') || category.includes('income')) {
              updates.incomeClass = IncomeClass.EARNED;
            } else if (category.includes('interest') || category.includes('dividend') || category.includes('investment')) {
              updates.incomeClass = IncomeClass.PASSIVE;
            } else if (category.includes('refund') || category.includes('return') || category.includes('reimburs') || category.includes('cashback')) {
              updates.incomeClass = IncomeClass.REIMBURSEMENT;
            } else if (category.includes('gift') || category.includes('settlement')) {
              updates.incomeClass = IncomeClass.WINDFALL;
            } else {
              // Default to EARNED for backward compatibility
              updates.incomeClass = IncomeClass.EARNED;
              updates.category = 'Other Income';
            }
          }

          await tx.table('transactions').update(transaction.id, updates);
        }
      });
  }
}

export const db = new BudgetTrackerDatabase();

// Settings helpers
export async function getSettings(): Promise<AppSettings | null> {
  const settings = await db.settings.get(1);
  if (!settings) return null;
  return {
    apiKey: settings.apiKey,
    defaultCategories: settings.defaultCategories,
    currency: settings.currency,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 1 });
}

// Transaction helpers
export async function addTransactions(transactions: Transaction[]): Promise<void> {
  await db.transactions.bulkAdd(transactions);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return await db.transactions.toArray();
}

export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  return await db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, updates);
}

export async function updateMerchantInAllTransactions(oldMerchant: string, newMerchant: string): Promise<void> {
  const transactions = await db.transactions.where('merchant').equals(oldMerchant).toArray();
  for (const tx of transactions) {
    await db.transactions.update(tx.id, { merchant: newMerchant });
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function checkForDuplicates(
  date: string,
  description: string,
  amount: number
): Promise<boolean> {
  const existing = await db.transactions
    .where('date')
    .equals(date)
    .and((tx) => tx.description === description && tx.amount === amount)
    .first();
  return !!existing;
}

// Merchant rule helpers
export async function getMerchantRules(): Promise<MerchantRule[]> {
  return await db.merchantRules.toArray();
}

export async function addMerchantRule(rule: MerchantRule): Promise<void> {
  await db.merchantRules.add(rule);
}

export async function findMerchantRule(description: string): Promise<string | null> {
  const rules = await getMerchantRules();
  for (const rule of rules) {
    if (description.toUpperCase().includes(rule.pattern.toUpperCase())) {
      return rule.category;
    }
  }
  return null;
}

// Budget helpers
export async function getBudgets(): Promise<Budget[]> {
  return await db.budgets.toArray();
}

export async function saveBudget(budget: Budget): Promise<void> {
  await db.budgets.put(budget);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

export async function getBudgetByCategory(category: string): Promise<Budget | undefined> {
  return await db.budgets.where('category').equals(category).first();
}

// Account helpers
export async function getAccounts(): Promise<Account[]> {
  return await db.accounts.toArray();
}

export async function addAccount(account: Account): Promise<void> {
  await db.accounts.add(account);
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  await db.accounts.update(id, updates);
}

export async function deleteAccount(id: string): Promise<void> {
  // First, delete all transactions for this account
  await db.transactions.where('accountId').equals(id).delete();
  // Then delete the account
  await db.accounts.delete(id);
}

export async function getDefaultAccount(): Promise<Account | undefined> {
  const accounts = await db.accounts.toArray();
  return accounts.find(a => a.isDefault);
}

export async function setDefaultAccount(id: string): Promise<void> {
  // Remove default flag from all accounts
  const accounts = await db.accounts.toArray();
  for (const account of accounts) {
    if (account.isDefault) {
      await db.accounts.update(account.id, { isDefault: false });
    }
  }
  // Set new default
  await db.accounts.update(id, { isDefault: true });
}

export async function getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  return await db.transactions.where('accountId').equals(accountId).toArray();
}

// Data management
export async function exportData(): Promise<string> {
  const transactions = await db.transactions.toArray();
  const merchantRules = await db.merchantRules.toArray();
  const budgets = await db.budgets.toArray();
  const accounts = await db.accounts.toArray();
  const settings = await getSettings();

  return JSON.stringify(
    {
      transactions,
      merchantRules,
      budgets,
      accounts,
      settings,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  if (data.settings) await saveSettings(data.settings);
  if (data.accounts) await db.accounts.bulkAdd(data.accounts);
  if (data.transactions) await db.transactions.bulkAdd(data.transactions);
  if (data.merchantRules) await db.merchantRules.bulkAdd(data.merchantRules);
  if (data.budgets) await db.budgets.bulkPut(data.budgets);
}

export async function clearTransactions(): Promise<void> {
  await db.transactions.clear();
}

export async function clearAllData(): Promise<void> {
  await db.transactions.clear();
  await db.merchantRules.clear();
  await db.budgets.clear();
  await db.accounts.clear();
  await db.settings.clear();
}

// Backup management
const LAST_BACKUP_KEY = 'budgetTracker_lastBackup';
const BACKUP_REMINDER_DAYS = 7;

export function getLastBackupDate(): Date | null {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
  return lastBackup ? new Date(lastBackup) : null;
}

export function setLastBackupDate(date: Date = new Date()): void {
  localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
}

export function shouldRemindBackup(): boolean {
  const lastBackup = getLastBackupDate();
  if (!lastBackup) return true;

  const daysSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceBackup >= BACKUP_REMINDER_DAYS;
}

export async function createAutomaticBackup(): Promise<void> {
  const data = await exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-tracker-auto-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setLastBackupDate();
}
