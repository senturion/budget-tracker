import { getMerchantById } from '../services/storage';
import type { Transaction, Merchant } from '../types';

/**
 * Compatibility helper to get merchant name from transaction
 * Handles both old (merchant: string) and new (merchantId: string) formats
 */
export async function getMerchantName(transaction: Transaction): Promise<string> {
  // If transaction has old merchant field (backwards compat), use it
  if (transaction.merchant) {
    return transaction.merchant;
  }

  // Otherwise, look up merchant by ID
  if (transaction.merchantId) {
    const merchant = await getMerchantById(transaction.merchantId);
    return merchant?.name || 'Unknown';
  }

  return 'Unknown';
}

/**
 * Get merchant names for multiple transactions in batch
 * More efficient than calling getMerchantName individually
 */
export async function getMerchantNames(transactions: Transaction[]): Promise<Map<string, string>> {
  const merchantMap = new Map<string, string>();

  // Import here to avoid circular dependency
  const { getMerchants } = await import('../services/storage');
  const allMerchants = await getMerchants();
  const merchantLookup = new Map(allMerchants.map(m => [m.id, m.name]));

  for (const txn of transactions) {
    // Use old merchant field if available
    if (txn.merchant) {
      merchantMap.set(txn.id, txn.merchant);
    } else if (txn.merchantId) {
      const name = merchantLookup.get(txn.merchantId) || 'Unknown';
      merchantMap.set(txn.id, name);
    } else {
      merchantMap.set(txn.id, 'Unknown');
    }
  }

  return merchantMap;
}

/**
 * Enrich transactions with merchant names (non-destructive)
 * Adds a computed 'merchantName' field for display
 */
export async function enrichTransactionsWithMerchants<T extends Transaction>(
  transactions: T[]
): Promise<(T & { merchantName: string })[]> {
  const merchantNames = await getMerchantNames(transactions);

  return transactions.map(txn => ({
    ...txn,
    merchantName: merchantNames.get(txn.id) || 'Unknown',
  }));
}
