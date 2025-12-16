import type { Transaction } from '../types';
import { TransactionType, IncomeClass } from '../types';

export class TransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionValidationError';
  }
}

/**
 * Validates a transaction according to the core rules:
 * - TRANSFER requires both accountId and toAccountId
 * - TRANSFER cannot have category
 * - EXPENSE cannot have incomeClass
 * - INFLOW must have incomeClass
 * - TRANSFER and ADJUSTMENT must have affectsBudget = false
 * - EXPENSE and INFLOW must have affectsBudget = true (unless explicitly set)
 */
export function validateTransaction(transaction: Partial<Transaction>): void {
  if (!transaction.type) {
    throw new TransactionValidationError('Transaction must have a type');
  }

  switch (transaction.type) {
    case TransactionType.TRANSFER:
      validateTransfer(transaction);
      break;
    case TransactionType.EXPENSE:
      validateExpense(transaction);
      break;
    case TransactionType.INFLOW:
      validateInflow(transaction);
      break;
    case TransactionType.ADJUSTMENT:
      validateAdjustment(transaction);
      break;
  }
}

function validateTransfer(transaction: Partial<Transaction>): void {
  if (!transaction.accountId) {
    throw new TransactionValidationError('TRANSFER requires accountId (from account)');
  }

  if (!transaction.toAccountId) {
    throw new TransactionValidationError('TRANSFER requires toAccountId (to account)');
  }

  if (transaction.accountId === transaction.toAccountId) {
    throw new TransactionValidationError('TRANSFER cannot have same from and to account');
  }

  if (transaction.category) {
    throw new TransactionValidationError('TRANSFER cannot have a category');
  }

  if (transaction.incomeClass) {
    throw new TransactionValidationError('TRANSFER cannot have incomeClass');
  }

  if (transaction.affectsBudget === true) {
    throw new TransactionValidationError('TRANSFER must have affectsBudget = false');
  }
}

function validateExpense(transaction: Partial<Transaction>): void {
  if (!transaction.accountId) {
    throw new TransactionValidationError('EXPENSE requires accountId');
  }

  if (transaction.toAccountId) {
    throw new TransactionValidationError('EXPENSE cannot have toAccountId (use TRANSFER for payments)');
  }

  if (transaction.incomeClass) {
    throw new TransactionValidationError('EXPENSE cannot have incomeClass');
  }

  if (!transaction.category) {
    throw new TransactionValidationError('EXPENSE must have a category');
  }

  // Expenses should affect budget unless explicitly set to false
  if (transaction.affectsBudget === false) {
    console.warn('EXPENSE with affectsBudget=false is unusual');
  }
}

function validateInflow(transaction: Partial<Transaction>): void {
  if (!transaction.accountId) {
    throw new TransactionValidationError('INFLOW requires accountId');
  }

  if (transaction.toAccountId) {
    throw new TransactionValidationError('INFLOW cannot have toAccountId');
  }

  if (!transaction.incomeClass) {
    throw new TransactionValidationError('INFLOW must have incomeClass');
  }

  if (!transaction.category) {
    throw new TransactionValidationError('INFLOW must have a category');
  }

  // Inflows should affect budget unless explicitly set to false
  if (transaction.affectsBudget === false) {
    console.warn('INFLOW with affectsBudget=false is unusual');
  }
}

function validateAdjustment(transaction: Partial<Transaction>): void {
  if (!transaction.accountId) {
    throw new TransactionValidationError('ADJUSTMENT requires accountId');
  }

  if (transaction.category) {
    throw new TransactionValidationError('ADJUSTMENT cannot have a category');
  }

  if (transaction.incomeClass) {
    throw new TransactionValidationError('ADJUSTMENT cannot have incomeClass');
  }

  if (transaction.affectsBudget === true) {
    throw new TransactionValidationError('ADJUSTMENT must have affectsBudget = false');
  }
}

/**
 * Helper to determine if a transaction affects spending reports
 */
export function affectsSpending(transaction: Transaction): boolean {
  return transaction.type === TransactionType.EXPENSE && transaction.affectsBudget;
}

/**
 * Helper to determine if a transaction affects income reports
 * Only EARNED and PASSIVE income count as income
 * REIMBURSEMENT and WINDFALL are excluded
 */
export function affectsIncome(transaction: Transaction): boolean {
  return (
    transaction.type === TransactionType.INFLOW &&
    transaction.affectsBudget &&
    (transaction.incomeClass === IncomeClass.EARNED ||
     transaction.incomeClass === IncomeClass.PASSIVE)
  );
}

/**
 * Helper to determine if a transaction affects cash flow
 * All INFLOW and EXPENSE, but not TRANSFER or ADJUSTMENT
 */
export function affectsCashFlow(transaction: Transaction): boolean {
  return (
    transaction.type === TransactionType.INFLOW ||
    transaction.type === TransactionType.EXPENSE
  );
}

/**
 * Helper to determine if a transaction affects net worth
 * Everything except ADJUSTMENT
 */
export function affectsNetWorth(transaction: Transaction): boolean {
  return transaction.type !== TransactionType.ADJUSTMENT;
}

/**
 * Helper to check if a transaction is a credit card payment
 * (transfer from checking/debit to credit account)
 */
export function isCreditCardPayment(transaction: Transaction, accounts: Array<{ id: string; type: string }>): boolean {
  if (transaction.type !== TransactionType.TRANSFER) {
    return false;
  }

  const fromAccount = accounts.find(a => a.id === transaction.accountId);
  const toAccount = accounts.find(a => a.id === transaction.toAccountId);

  return (
    fromAccount?.type === 'checking' || fromAccount?.type === 'debit'
  ) && toAccount?.type === 'credit';
}
