import Dexie, { type Table } from 'dexie';
import type { Transaction, MerchantRule, Budget, AppSettings, Account, BankAccount, CreditCardAccount, Merchant, Tag, TransactionTag } from '../types';
import { TransactionType, IncomeClass, AccountType, BankAccountSubtype, BudgetType } from '../types';
import { v4 as uuidv4 } from 'uuid';

class BudgetTrackerDatabase extends Dexie {
  transactions!: Table<Transaction>;
  merchantRules!: Table<MerchantRule>;
  budgets!: Table<Budget>;
  settings!: Table<AppSettings & { id: number }>;
  accounts!: Table<Account>;
  merchants!: Table<Merchant>;
  tags!: Table<Tag>;
  transactionTags!: Table<TransactionTag>;

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
        const defaultAccount: CreditCardAccount = {
          id: 'default-account',
          name: 'Default Account',
          accountType: AccountType.CREDIT_CARD,
          currency: 'CAD',
          isActive: true,
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

    // Migrate accounts to new schema with AccountType distinction
    this.version(5)
      .stores({
        transactions: 'id, accountId, toAccountId, type, date, category, merchant, amount, importedAt, affectsBudget',
        merchantRules: '++id, pattern, category',
        budgets: 'id, category, accountId',
        settings: 'id',
        accounts: 'id, name, accountType, isDefault, isActive',
      })
      .upgrade(async (tx) => {
        // Migrate existing accounts to new schema
        const oldAccounts = await tx.table('accounts').toArray();

        for (const oldAccount of oldAccounts) {
          // Determine account type from old 'type' field
          const isCreditCard = oldAccount.type === 'credit';

          if (isCreditCard) {
            // Migrate to credit card account
            const creditCardAccount: CreditCardAccount = {
              id: oldAccount.id,
              name: oldAccount.name,
              accountType: AccountType.CREDIT_CARD,
              institution: oldAccount.institution,
              currency: 'CAD',
              isActive: true,
              color: oldAccount.color,
              isDefault: oldAccount.isDefault,
              createdAt: oldAccount.createdAt,
              // Credit card specific fields - will be filled in by user later
              issuer: oldAccount.institution,
              creditLimit: undefined,
              currentBalance: undefined,
              availableCredit: undefined,
            };
            await tx.table('accounts').put(creditCardAccount);
          } else {
            // Migrate to bank account
            const bankAccount: BankAccount = {
              id: oldAccount.id,
              name: oldAccount.name,
              accountType: AccountType.BANK,
              subtype: oldAccount.type === 'chequing' ? BankAccountSubtype.CHEQUING :
                       oldAccount.type === 'savings' ? BankAccountSubtype.SAVINGS :
                       BankAccountSubtype.CHEQUING, // default to chequing
              institution: oldAccount.institution,
              currency: 'CAD',
              isActive: true,
              color: oldAccount.color,
              isDefault: oldAccount.isDefault,
              createdAt: oldAccount.createdAt,
              currentBalance: undefined,
              availableBalance: undefined,
            };
            await tx.table('accounts').put(bankAccount);
          }
        }
      });

    // Add merchants, tags, and enhance budgets
    this.version(6)
      .stores({
        transactions: 'id, accountId, toAccountId, type, date, category, merchantId, amount, importedAt, affectsBudget, *tags',
        merchantRules: '++id, merchantId, category', // Keep auto-increment to avoid primary key change error
        budgets: 'id, type, targetId, accountId',
        settings: 'id',
        accounts: 'id, name, accountType, isDefault, isActive',
        merchants: 'id, name, *aliases',
        tags: 'id, name',
        transactionTags: '[transactionId+tagId], transactionId, tagId',
      })
      .upgrade(async (tx) => {
        console.log('Starting v6 migration: merchants, tags, and enhanced budgets');

        // Step 1: Extract unique merchants from transactions and create Merchant entities
        const transactions = await tx.table('transactions').toArray();
        const merchantMap = new Map<string, Merchant>();

        transactions.forEach((txn: any) => {
          if (txn.merchant && !merchantMap.has(txn.merchant)) {
            const merchant: Merchant = {
              id: uuidv4(),
              name: txn.merchant,
              aliases: [txn.merchant],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            merchantMap.set(txn.merchant, merchant);
          }
        });

        // Add all merchants to the new merchants table
        if (merchantMap.size > 0) {
          console.log(`Creating ${merchantMap.size} merchant entities`);
          await tx.table('merchants').bulkAdd(Array.from(merchantMap.values()));
        }

        // Step 2: Update transactions to use merchantId instead of merchant string
        for (const txn of transactions) {
          const merchant = merchantMap.get(txn.merchant);
          if (merchant) {
            await tx.table('transactions').update(txn.id, {
              merchantId: merchant.id,
              // Keep old merchant field for backwards compat during migration
              // Will be removed in later version
            });
          } else {
            // Transaction has no merchant - create a placeholder
            const unknownMerchant: Merchant = {
              id: uuidv4(),
              name: 'Unknown',
              aliases: ['Unknown'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await tx.table('merchants').add(unknownMerchant);
            await tx.table('transactions').update(txn.id, {
              merchantId: unknownMerchant.id,
            });
          }
        }

        // Step 3: Update merchant rules to reference merchantId
        const oldRules = await tx.table('merchantRules').toArray();
        console.log(`Migrating ${oldRules.length} merchant rules`);

        for (const rule of oldRules) {
          // Find merchant by pattern (old rules used pattern matching)
          const merchant = Array.from(merchantMap.values()).find(m =>
            m.name === rule.pattern || m.aliases.includes(rule.pattern)
          );

          if (merchant) {
            await tx.table('merchantRules').update(rule.id || rule.pattern, {
              id: rule.id || uuidv4(),
              merchantId: merchant.id,
              category: rule.category,
              createdAt: rule.createdAt || new Date().toISOString(),
            });
          } else {
            // Create new merchant for this rule
            const newMerchant: Merchant = {
              id: uuidv4(),
              name: rule.pattern,
              aliases: [rule.pattern],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await tx.table('merchants').add(newMerchant);
            await tx.table('merchantRules').update(rule.id || rule.pattern, {
              id: rule.id || uuidv4(),
              merchantId: newMerchant.id,
              category: rule.category,
              createdAt: rule.createdAt || new Date().toISOString(),
            });
          }
        }

        // Step 4: Migrate budgets to new schema with type/targetId
        const oldBudgets = await tx.table('budgets').toArray();
        console.log(`Migrating ${oldBudgets.length} budgets to new schema`);

        for (const budget of oldBudgets) {
          await tx.table('budgets').update(budget.id, {
            type: BudgetType.CATEGORY,
            targetId: budget.category,
            // Keep category field for backwards compat
          });
        }

        console.log('v6 migration complete');
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

// Merchant helpers
export async function getMerchants(): Promise<Merchant[]> {
  return await db.merchants.toArray();
}

export async function getMerchantById(id: string): Promise<Merchant | undefined> {
  return await db.merchants.get(id);
}

export async function addMerchant(merchant: Merchant): Promise<void> {
  await db.merchants.add(merchant);
}

export async function updateMerchant(id: string, updates: Partial<Merchant>): Promise<void> {
  await db.merchants.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMerchant(id: string): Promise<void> {
  // Note: This will leave transactions with orphaned merchantId
  // UI should prevent deletion of merchants with transactions
  await db.merchants.delete(id);
}

export async function findMerchantByName(name: string): Promise<Merchant | undefined> {
  return await db.merchants.where('name').equals(name).first();
}

export async function findMerchantByAlias(alias: string): Promise<Merchant | undefined> {
  const merchants = await db.merchants.toArray();
  return merchants.find(m => m.aliases.includes(alias));
}

export async function mergeMerchants(fromMerchantId: string, toMerchantId: string): Promise<void> {
  // Update all transactions using fromMerchantId to use toMerchantId
  const transactions = await db.transactions.where('merchantId').equals(fromMerchantId).toArray();
  for (const txn of transactions) {
    await db.transactions.update(txn.id, { merchantId: toMerchantId });
  }

  // Update all merchant rules
  const rules = await db.merchantRules.where('merchantId').equals(fromMerchantId).toArray();
  for (const rule of rules) {
    await db.merchantRules.update(rule.id, { merchantId: toMerchantId });
  }

  // Delete the old merchant
  await db.merchants.delete(fromMerchantId);
}

// Tag helpers
export async function getTags(): Promise<Tag[]> {
  return await db.tags.toArray();
}

export async function getTagById(id: string): Promise<Tag | undefined> {
  return await db.tags.get(id);
}

export async function addTag(tag: Tag): Promise<void> {
  await db.tags.add(tag);
}

export async function updateTag(id: string, updates: Partial<Tag>): Promise<void> {
  await db.tags.update(id, updates);
}

export async function deleteTag(id: string): Promise<void> {
  // Remove all transaction-tag associations
  await db.transactionTags.where('tagId').equals(id).delete();
  // Delete the tag
  await db.tags.delete(id);
}

export async function getTransactionTags(transactionId: string): Promise<Tag[]> {
  const transactionTags = await db.transactionTags.where('transactionId').equals(transactionId).toArray();
  const tagIds = transactionTags.map(tt => tt.tagId);
  const tags = await Promise.all(tagIds.map(id => db.tags.get(id)));
  return tags.filter((t): t is Tag => t !== undefined);
}

export async function addTagToTransaction(transactionId: string, tagId: string): Promise<void> {
  // Check if association already exists
  const existing = await db.transactionTags.get([transactionId, tagId]);
  if (!existing) {
    await db.transactionTags.add({ transactionId, tagId });

    // Update denormalized tags array on transaction
    const transaction = await db.transactions.get(transactionId);
    if (transaction) {
      const tags = transaction.tags || [];
      if (!tags.includes(tagId)) {
        await db.transactions.update(transactionId, { tags: [...tags, tagId] });
      }
    }
  }
}

export async function removeTagFromTransaction(transactionId: string, tagId: string): Promise<void> {
  await db.transactionTags.delete([transactionId, tagId]);

  // Update denormalized tags array on transaction
  const transaction = await db.transactions.get(transactionId);
  if (transaction && transaction.tags) {
    await db.transactions.update(transactionId, {
      tags: transaction.tags.filter(t => t !== tagId),
    });
  }
}

export async function getTransactionsByTag(tagId: string): Promise<Transaction[]> {
  const transactionTags = await db.transactionTags.where('tagId').equals(tagId).toArray();
  const transactionIds = transactionTags.map(tt => tt.transactionId);
  const transactions = await Promise.all(transactionIds.map(id => db.transactions.get(id)));
  return transactions.filter((t): t is Transaction => t !== undefined);
}

// Data management
export async function exportData(): Promise<string> {
  const transactions = await db.transactions.toArray();
  const merchantRules = await db.merchantRules.toArray();
  const budgets = await db.budgets.toArray();
  const accounts = await db.accounts.toArray();
  const merchants = await db.merchants.toArray();
  const tags = await db.tags.toArray();
  const transactionTags = await db.transactionTags.toArray();
  const settings = await getSettings();

  return JSON.stringify(
    {
      transactions,
      merchantRules,
      budgets,
      accounts,
      merchants,
      tags,
      transactionTags,
      settings,
      exportedAt: new Date().toISOString(),
      version: 6, // Database schema version
    },
    null,
    2
  );
}

export async function importData(jsonData: string): Promise<void> {
  // Parse and validate JSON
  let data;
  try {
    data = JSON.parse(jsonData);
  } catch (error) {
    throw new Error('Invalid JSON format. Please check your backup file.');
  }

  // Validate data structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup data structure.');
  }

  // Import data in a transaction to ensure atomicity
  try {
    await db.transaction('rw', [db.settings, db.accounts, db.merchants, db.tags, db.transactions, db.transactionTags, db.merchantRules, db.budgets], async () => {
      if (data.settings) {
        await saveSettings(data.settings);
      }

      if (data.accounts && Array.isArray(data.accounts)) {
        // Use bulkPut instead of bulkAdd to handle duplicates
        await db.accounts.bulkPut(data.accounts);
      }

      // Import merchants before transactions (foreign key dependency)
      if (data.merchants && Array.isArray(data.merchants)) {
        await db.merchants.bulkPut(data.merchants);
      }

      // Import tags before transaction-tags (foreign key dependency)
      if (data.tags && Array.isArray(data.tags)) {
        await db.tags.bulkPut(data.tags);
      }

      if (data.transactions && Array.isArray(data.transactions)) {
        await db.transactions.bulkPut(data.transactions);
      }

      // Import transaction-tag associations
      if (data.transactionTags && Array.isArray(data.transactionTags)) {
        await db.transactionTags.bulkPut(data.transactionTags);
      }

      if (data.merchantRules && Array.isArray(data.merchantRules)) {
        await db.merchantRules.bulkPut(data.merchantRules);
      }

      if (data.budgets && Array.isArray(data.budgets)) {
        await db.budgets.bulkPut(data.budgets);
      }
    });
  } catch (error) {
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}. Your data has not been modified.`);
  }
}

export async function clearTransactions(): Promise<void> {
  await db.transactions.clear();
}

export async function clearMerchantRules(): Promise<void> {
  await db.merchantRules.clear();
}

export async function fixCreditCardTransfers(): Promise<number> {
  // Fix TRANSFER transactions on credit cards to have toAccountId set
  const allTransactions = await db.transactions.toArray();
  const allAccounts = await db.accounts.toArray();

  const creditCardIds = new Set(
    allAccounts
      .filter(acc => acc.accountType === 'CREDIT_CARD')
      .map(acc => acc.id)
  );

  let fixedCount = 0;

  for (const tx of allTransactions) {
    // Find TRANSFER transactions on credit card accounts that don't have toAccountId set
    if (
      tx.type === 'TRANSFER' &&
      creditCardIds.has(tx.accountId) &&
      !tx.toAccountId
    ) {
      // Set toAccountId to the credit card account (the account being paid)
      await db.transactions.update(tx.id, {
        toAccountId: tx.accountId
      });
      fixedCount++;
    }
  }

  return fixedCount;
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
