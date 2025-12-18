import Anthropic from '@anthropic-ai/sdk';
import type { SpendingSummary, Transaction } from '../types';
import { TransactionType, IncomeClass, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';

const MODEL = 'claude-sonnet-4-5-20250929';

export interface CategorizationResult {
  category: string;
  incomeClass?: IncomeClass; // Only for INFLOW transactions
  transactionType?: TransactionType; // Optional type override (e.g., for TRANSFER or ADJUSTMENT)
}

interface CategorizationResponse {
  category: string;
  incomeClass?: IncomeClass;
  transactionType?: TransactionType;
}

export async function categorizeTransactions(
  apiKey: string,
  transactions: Transaction[],
  userCategories?: { expense: string[]; income: string[] }
): Promise<Record<string, CategorizationResult>> {
  // Use provided categories or fall back to defaults
  const expenseCategories = userCategories?.expense || EXPENSE_CATEGORIES;
  const incomeCategories = userCategories?.income || INCOME_CATEGORIES;
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for browser usage
  });

  // Separate expenses and inflows for better categorization
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  const inflows = transactions.filter(t => t.type === TransactionType.INFLOW);

  const results: Record<string, CategorizationResult> = {};

  // Categorize expenses
  if (expenses.length > 0) {
    const expensePrompt = `Categorize these EXPENSE transactions and detect their actual transaction type. Return only valid JSON.

Categories: ${expenseCategories.join(', ')}

Transaction Types:
- EXPENSE: Normal spending (default)
- TRANSFER: Payment to another account (e.g., "PAYMENT - THANK YOU", credit card payments)
- ADJUSTMENT: Account corrections, reconciliations, balance adjustments

Transactions:
${expenses.map((t) => `- ${t.description}`).join('\n')}

Return format:
- For normal expenses: {"transaction_description": "Category"}
- For transfers/adjustments: {"transaction_description": {"category": null, "transactionType": "TRANSFER"}}

Include every transaction. Use "Other" if unsure about category.

Important context:
- FARM BOY, RCSS, WAL-MART, LOBLAWS are grocery stores
- SQ *EQUATOR, SQ *BRIDGEHEAD, STARBUCKS are coffee shops
- UBER CANADA/UBEREATS, UBER EATS are food delivery
- American Eagle, Aerie, Old Navy are clothing stores
- OVERLIMIT FEE, INTEREST CHARGE are fees and interest
- PAYMENT - THANK YOU, AUTOMATIC PAYMENT are credit card payments (TRANSFER type)
- BALANCE ADJUSTMENT, RECONCILIATION are corrections (ADJUSTMENT type)`;

    const expenseResults = await callClaude(client, expensePrompt);
    for (const [desc, value] of Object.entries(expenseResults)) {
      if (typeof value === 'string') {
        results[desc] = { category: value };
      } else {
        const response = value as CategorizationResponse;
        results[desc] = {
          category: response.category,
          transactionType: response.transactionType,
        };
      }
    }
  }

  // Categorize inflows with income class detection
  if (inflows.length > 0) {
    const inflowPrompt = `Categorize these INFLOW (income/credit) transactions. For each, provide:
1. Category from the list
2. Income class: EARNED (salary/wages), PASSIVE (interest/dividends/cashback), REIMBURSEMENT (refunds/returns), WINDFALL (gifts), or ADJUSTMENT
3. Transaction type override if needed: TRANSFER (for account transfers), ADJUSTMENT (for corrections), or leave as INFLOW (default)

Income Categories: ${incomeCategories.join(', ')}

Transactions:
${inflows.map((t) => `- ${t.description}`).join('\n')}

Return format: {"transaction_description": {"category": "Category Name", "incomeClass": "EARNED", "transactionType": "INFLOW"}, ...}

Examples:
- "PAYMENT - SALARY" -> {"category": "Income: Salary", "incomeClass": "EARNED"}
- "REFUND - AMAZON" -> {"category": "Amazon", "incomeClass": "REIMBURSEMENT"}
- "CASHBACK REWARD" -> {"category": "Cashback", "incomeClass": "PASSIVE"}
- "INTEREST PAYMENT" -> {"category": "Interest", "incomeClass": "PASSIVE"}
- "TRANSFER FROM SAVINGS" -> {"category": null, "transactionType": "TRANSFER"}
- "BALANCE CORRECTION" -> {"category": null, "transactionType": "ADJUSTMENT"}`;

    const inflowResults = await callClaude(client, inflowPrompt);
    for (const [desc, value] of Object.entries(inflowResults)) {
      if (typeof value === 'object' && value !== null && 'category' in value) {
        const response = value as CategorizationResponse;
        results[desc] = {
          category: response.category,
          incomeClass: response.incomeClass || IncomeClass.EARNED,
          transactionType: response.transactionType,
        };
      } else {
        // Fallback if AI returns simple string
        results[desc] = {
          category: String(value),
          incomeClass: IncomeClass.EARNED, // Default
        };
      }
    }
  }

  return results;
}

async function callClaude(client: Anthropic, prompt: string): Promise<Record<string, string | CategorizationResponse>> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Validate response structure
    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude API');
    }

    const content = response.content[0];
    if (!content) {
      throw new Error('No content in Claude API response');
    }

    if (content.type === 'text') {
      if (!content.text) {
        throw new Error('Empty text content in Claude API response');
      }

      let textToParse = content.text;

      // Remove markdown code blocks if present
      textToParse = textToParse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to extract JSON object
      const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed;
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Attempted to parse:', jsonMatch[0]);
          throw new Error('Invalid JSON in response');
        }
      }

      console.error('No JSON found in response:', content.text);
    }

    throw new Error('Failed to parse categorization response');
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export async function analyzeSpending(
  apiKey: string,
  summaryData: SpendingSummary
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const prompt = `Analyze this spending data and provide 3-5 actionable insights. Be specific and reference actual numbers. Keep it concise.

${JSON.stringify(summaryData, null, 2)}

Focus on: unusual patterns, biggest spending areas, month-over-month changes, potential savings opportunities.

Context: This is for a family of four in Ottawa, Canada with a monthly spending target of around $7,000-8,000.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Validate response structure
    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude API');
    }

    const content = response.content[0];
    if (!content) {
      throw new Error('No content in Claude API response');
    }

    if (content.type === 'text') {
      if (!content.text) {
        throw new Error('Empty text content in Claude API response');
      }
      return content.text;
    }

    throw new Error('Failed to get analysis response');
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    await client.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    return true;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}
