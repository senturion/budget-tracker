import type { Transaction } from '../types';

export function filterTransactionsByAccount(
  transactions: Transaction[],
  accountId: string | 'all'
): Transaction[] {
  if (accountId === 'all') {
    return transactions;
  }
  return transactions.filter(tx => tx.accountId === accountId);
}
