import { create } from 'zustand';
import type { Transaction, AppSettings, MerchantRule, Budget, Account } from '../types';
import {
  getAllTransactions,
  getSettings,
  saveSettings as saveSettingsToDb,
  getMerchantRules,
  getBudgets,
  saveBudget,
  deleteBudget,
  getAccounts,
  addAccount as addAccountToDb,
  updateAccount as updateAccountInDb,
  deleteAccount as deleteAccountFromDb,
  setDefaultAccount as setDefaultAccountInDb,
} from '../services/storage';
import { DEFAULT_CATEGORIES } from '../types';

interface AppState {
  // Data
  transactions: Transaction[];
  settings: AppSettings | null;
  merchantRules: MerchantRule[];
  budgets: Budget[];
  accounts: Account[];

  // UI state
  currentView: 'dashboard' | 'transactions' | 'trends' | 'budgets' | 'settings' | 'upload';
  selectedMonth: Date;
  selectedAccountId: string | 'all'; // 'all' means show all accounts
  isLoading: boolean;
  error: string | null;

  // Actions
  loadData: () => Promise<void>;
  setTransactions: (transactions: Transaction[]) => void;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  setSettings: (settings: AppSettings) => void;
  saveSettings: (settings: AppSettings) => Promise<void>;
  setMerchantRules: (rules: MerchantRule[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  setDefaultAccount: (id: string) => Promise<void>;
  setSelectedAccountId: (accountId: string | 'all') => void;
  setCurrentView: (view: AppState['currentView']) => void;
  setSelectedMonth: (month: Date) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  transactions: [],
  settings: null,
  merchantRules: [],
  budgets: [],
  accounts: [],
  currentView: 'dashboard',
  selectedMonth: new Date(),
  selectedAccountId: 'all',
  isLoading: false,
  error: null,

  // Actions
  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [transactions, settings, merchantRules, budgets, accounts] = await Promise.all([
        getAllTransactions(),
        getSettings(),
        getMerchantRules(),
        getBudgets(),
        getAccounts(),
      ]);

      set({
        transactions,
        settings: settings || {
          apiKey: '',
          defaultCategories: DEFAULT_CATEGORIES,
          currency: 'CAD',
        },
        merchantRules,
        budgets,
        accounts,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load data',
        isLoading: false,
      });
    }
  },

  setTransactions: (transactions) => set({ transactions }),

  addTransactions: (newTransactions) => {
    const { transactions } = get();
    set({ transactions: [...transactions, ...newTransactions] });
  },

  updateTransaction: (id, updates) => {
    const { transactions } = get();
    set({
      transactions: transactions.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
    });
  },

  setSettings: (settings) => set({ settings }),

  saveSettings: async (settings) => {
    try {
      await saveSettingsToDb(settings);
      set({ settings });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save settings' });
    }
  },

  setMerchantRules: (merchantRules) => set({ merchantRules }),

  setBudgets: (budgets) => set({ budgets }),

  addBudget: async (budget) => {
    try {
      await saveBudget(budget);
      const budgets = await getBudgets();
      set({ budgets });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save budget' });
    }
  },

  removeBudget: async (id) => {
    try {
      await deleteBudget(id);
      const budgets = await getBudgets();
      set({ budgets });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete budget' });
    }
  },

  setAccounts: (accounts) => set({ accounts }),

  addAccount: async (account) => {
    try {
      await addAccountToDb(account);
      const accounts = await getAccounts();
      set({ accounts });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add account' });
    }
  },

  updateAccount: async (id, updates) => {
    try {
      await updateAccountInDb(id, updates);
      const accounts = await getAccounts();
      set({ accounts });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update account' });
    }
  },

  removeAccount: async (id) => {
    try {
      await deleteAccountFromDb(id);
      const accounts = await getAccounts();
      const { selectedAccountId } = get();
      // If deleted account was selected, switch to 'all'
      if (selectedAccountId === id) {
        set({ accounts, selectedAccountId: 'all' });
      } else {
        set({ accounts });
      }
      // Reload transactions since they were deleted
      const transactions = await getAllTransactions();
      set({ transactions });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete account' });
    }
  },

  setDefaultAccount: async (id) => {
    try {
      await setDefaultAccountInDb(id);
      const accounts = await getAccounts();
      set({ accounts });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set default account' });
    }
  },

  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),

  setCurrentView: (currentView) => set({ currentView }),

  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),

  setError: (error) => set({ error }),
}));
