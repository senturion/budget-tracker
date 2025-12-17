import type { Transaction, Account, BankAccount, CreditCardAccount } from '../types';
import { AccountType, TransactionType, IncomeClass } from '../types';
import { affectsSpending, affectsIncome } from './transactionValidation';

// ============================================================================
// BANK ACCOUNT METRICS
// ============================================================================

export interface BankAccountMetrics {
  accountType: typeof AccountType.BANK;
  currentBalance?: number;
  availableBalance?: number;

  // Period metrics
  netCashFlow: number;           // INFLOW - EXPENSE for the period
  totalIncome: number;           // EARNED + PASSIVE income only
  totalSpending: number;         // EXPENSE only (excludes transfers)

  // Breakdown
  earnedIncome: number;
  passiveIncome: number;
  reimbursements: number;
  transfers: number;             // TRANSFER transactions
}

export function calculateBankAccountMetrics(
  account: BankAccount,
  periodTransactions: Transaction[]
): BankAccountMetrics {
  let totalIncome = 0;
  let totalSpending = 0;
  let earnedIncome = 0;
  let passiveIncome = 0;
  let reimbursements = 0;
  let transfers = 0;

  periodTransactions.forEach((tx) => {
    if (tx.type === TransactionType.TRANSFER) {
      transfers += tx.amount;
    } else if (affectsSpending(tx)) {
      totalSpending += tx.amount;
    } else if (affectsIncome(tx)) {
      totalIncome += tx.amount;

      // Break down by income class
      if (tx.incomeClass === IncomeClass.EARNED) {
        earnedIncome += tx.amount;
      } else if (tx.incomeClass === IncomeClass.PASSIVE) {
        passiveIncome += tx.amount;
      } else if (tx.incomeClass === IncomeClass.REIMBURSEMENT) {
        reimbursements += tx.amount;
      }
    }
  });

  const netCashFlow = totalIncome - totalSpending;

  return {
    accountType: AccountType.BANK,
    currentBalance: account.currentBalance,
    availableBalance: account.availableBalance,
    netCashFlow,
    totalIncome,
    totalSpending,
    earnedIncome,
    passiveIncome,
    reimbursements,
    transfers,
  };
}

// ============================================================================
// CREDIT CARD METRICS
// ============================================================================

export interface CreditCardMetrics {
  accountType: typeof AccountType.CREDIT_CARD;
  balanceOwed?: number;
  availableCredit?: number;
  creditLimit?: number;
  utilizationPercent?: number;

  // Payment status
  statementDay?: number;
  dueDay?: number;
  minPayment?: number;
  paymentStatus?: 'OK' | 'DUE_SOON' | 'OVERDUE';

  // Period metrics
  spendThisPeriod: number;       // EXPENSE on this card
  paymentsThisPeriod: number;    // TRANSFER payments to this card
  interestCharged: number;       // Interest category expenses
  feesCharged: number;           // Fees category expenses
  refunds: number;               // INFLOW (reimbursements)
}

export function calculateCreditCardMetrics(
  account: CreditCardAccount,
  periodTransactions: Transaction[]
): CreditCardMetrics {
  let spendThisPeriod = 0;
  let paymentsThisPeriod = 0;
  let interestCharged = 0;
  let feesCharged = 0;
  let refunds = 0;

  periodTransactions.forEach((tx) => {
    if (tx.type === TransactionType.TRANSFER) {
      // Transfers TO the credit card are payments (reduce debt)
      if (tx.toAccountId === account.id) {
        paymentsThisPeriod += tx.amount;
      }
    } else if (tx.type === TransactionType.EXPENSE) {
      spendThisPeriod += tx.amount;

      // Track interest and fees separately
      if (tx.category?.toLowerCase().includes('interest')) {
        interestCharged += tx.amount;
      } else if (tx.category?.toLowerCase().includes('fee')) {
        feesCharged += tx.amount;
      }
    } else if (tx.type === TransactionType.INFLOW && tx.incomeClass === IncomeClass.REIMBURSEMENT) {
      refunds += tx.amount;
    }
  });

  // Calculate utilization if we have both values
  let utilizationPercent: number | undefined;
  if (account.creditLimit && account.currentBalance !== undefined) {
    utilizationPercent = (account.currentBalance / account.creditLimit) * 100;
  }

  return {
    accountType: AccountType.CREDIT_CARD,
    balanceOwed: account.currentBalance,
    availableCredit: account.availableCredit,
    creditLimit: account.creditLimit,
    utilizationPercent,
    statementDay: account.statementDay,
    dueDay: account.dueDay,
    minPayment: account.minPayment,
    paymentStatus: account.paymentStatus,
    spendThisPeriod,
    paymentsThisPeriod,
    interestCharged,
    feesCharged,
    refunds,
  };
}

// ============================================================================
// UNIFIED ACCOUNT METRICS
// ============================================================================

export type AccountMetrics = BankAccountMetrics | CreditCardMetrics;

export function calculateAccountMetrics(
  account: Account,
  periodTransactions: Transaction[]
): AccountMetrics {
  if (account.accountType === AccountType.BANK) {
    return calculateBankAccountMetrics(account, periodTransactions);
  } else {
    return calculateCreditCardMetrics(account, periodTransactions);
  }
}

// ============================================================================
// GLOBAL REPORTING FILTERS (prevent double-counting)
// ============================================================================

/**
 * Get spending totals across all accounts
 * INCLUDES: EXPENSE transactions
 * EXCLUDES: TRANSFER transactions (to prevent double-counting credit card payments)
 */
export function getGlobalSpending(transactions: Transaction[]): number {
  return transactions
    .filter(tx => affectsSpending(tx))
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Get income totals across all accounts
 * INCLUDES: INFLOW with income_class = EARNED or PASSIVE
 * EXCLUDES: REIMBURSEMENT by default (optional parameter to include)
 */
export function getGlobalIncome(
  transactions: Transaction[],
  includeReimbursements: boolean = false
): number {
  return transactions
    .filter(tx => {
      if (!affectsIncome(tx)) return false;
      if (!includeReimbursements && tx.incomeClass === IncomeClass.REIMBURSEMENT) {
        return false;
      }
      return tx.incomeClass === IncomeClass.EARNED || tx.incomeClass === IncomeClass.PASSIVE;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Get credit card payments (transfers from bank to credit card)
 * INCLUDES: TRANSFER where toAccountId is a credit card
 */
export function getCreditCardPayments(
  transactions: Transaction[],
  creditCardAccounts: CreditCardAccount[]
): number {
  const creditCardIds = new Set(creditCardAccounts.map(acc => acc.id));

  return transactions
    .filter(tx => tx.type === TransactionType.TRANSFER && tx.toAccountId && creditCardIds.has(tx.toAccountId))
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Get refunds/chargebacks
 * INCLUDES: INFLOW with income_class = REIMBURSEMENT
 */
export function getRefunds(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === TransactionType.INFLOW && tx.incomeClass === IncomeClass.REIMBURSEMENT)
    .reduce((sum, tx) => sum + tx.amount, 0);
}
