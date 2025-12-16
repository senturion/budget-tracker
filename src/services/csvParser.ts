import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, CSVRow } from '../types';
import { TransactionType } from '../types';

export interface ParsedCSV {
  transactions: Transaction[];
  errors: string[];
}

export function parseCSV(file: File, accountId: string): Promise<ParsedCSV> {
  return new Promise((resolve) => {
    Papa.parse<CSVRow>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: Transaction[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, index: number) => {
          try {
            // CSV format: date,description,charge,credit,balance
            const [dateStr, descriptionRaw, charge, credit] = row;

            // Clean quoted fields
            const cleanField = (field: string) => field ? field.replace(/"/g, '').trim() : '';
            const description = cleanField(descriptionRaw);

            if (!dateStr || !description) {
              errors.push(`Row ${index + 1}: Missing date or description`);
              return;
            }

            // Parse date (supports both MM/DD/YYYY and YYYY-MM-DD formats)
            const date = parseDateString(dateStr);
            if (!date) {
              errors.push(`Row ${index + 1}: Invalid date format: ${dateStr}`);
              return;
            }

            // Determine amount (positive for charges, negative for credits)
            let amount = 0;
            const chargeClean = cleanField(charge);
            const creditClean = cleanField(credit);

            if (chargeClean && chargeClean !== '') {
              amount = parseFloat(chargeClean);
            } else if (creditClean && creditClean !== '') {
              amount = -parseFloat(creditClean);
            }

            if (isNaN(amount) || amount === 0) {
              errors.push(`Row ${index + 1}: Invalid or zero amount`);
              return;
            }

            // Extract merchant name from description
            const merchant = cleanMerchantName(description);

            // Determine transaction type:
            // - Positive amounts (charges) are EXPENSE
            // - Negative amounts (credits/payments) are INFLOW
            // Note: Transfers will need to be manually created or identified
            const type = amount > 0 ? TransactionType.EXPENSE : TransactionType.INFLOW;

            const transaction: Transaction = {
              id: uuidv4(),
              type,
              accountId,
              date: date.toISOString(),
              description,
              merchant,
              amount: Math.abs(amount), // Amount is always positive
              category: null, // Will be set by AI categorization or manual input
              affectsBudget: true, // Default to true, can be changed manually
              importedAt: new Date().toISOString(),
              sourceFile: file.name,
            };

            transactions.push(transaction);
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        resolve({ transactions, errors });
      },
      error: (error) => {
        resolve({ transactions: [], errors: [error.message] });
      },
    });
  });
}

function parseDateString(dateStr: string): Date | null {
  try {
    // Remove quotes if present
    const cleanDate = dateStr.replace(/"/g, '').trim();

    // Try YYYY-MM-DD format (ISO format)
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try MM/DD/YYYY format
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (month > 0 && month <= 12 && day > 0 && day <= 31 && year > 1900) {
        return new Date(year, month - 1, day);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function cleanMerchantName(description: string): string {
  // Remove common prefixes and clean up merchant names
  let merchant = description.trim();

  // Remove common payment processor prefixes
  merchant = merchant.replace(/^SQ \*/i, '');
  merchant = merchant.replace(/^AMZN Mktp CA\*/i, 'Amazon.ca ');
  merchant = merchant.replace(/^Amazon\.ca\*/i, 'Amazon.ca ');
  merchant = merchant.replace(/^SP /i, '');
  merchant = merchant.replace(/^LS /i, '');
  merchant = merchant.replace(/^BAM\*/i, '');
  merchant = merchant.replace(/^ACT\*/i, '');
  merchant = merchant.replace(/^ABC\*/i, '');

  // Remove store numbers and location codes
  merchant = merchant.replace(/#\d+/g, '').trim();
  merchant = merchant.replace(/\s+\d{4,}$/g, '').trim();

  // Clean up whitespace
  merchant = merchant.replace(/\s+/g, ' ').trim();

  return merchant;
}

export function detectDuplicates(
  newTransactions: Transaction[],
  existingTransactions: Transaction[]
): { unique: Transaction[]; duplicates: Transaction[] } {
  const unique: Transaction[] = [];
  const duplicates: Transaction[] = [];

  const existingSet = new Set(
    existingTransactions.map((t) => `${t.date}-${t.description}-${t.amount}`)
  );

  newTransactions.forEach((transaction) => {
    const key = `${transaction.date}-${transaction.description}-${transaction.amount}`;
    if (existingSet.has(key)) {
      duplicates.push(transaction);
    } else {
      unique.push(transaction);
      existingSet.add(key);
    }
  });

  return { unique, duplicates };
}
