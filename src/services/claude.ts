import Anthropic from '@anthropic-ai/sdk';
import type { SpendingSummary } from '../types';

const MODEL = 'claude-sonnet-4-5-20250929';

export async function categorizeTransactions(
  apiKey: string,
  transactions: string[],
  categories: string[]
): Promise<Record<string, string>> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for browser usage
  });

  const prompt = `Categorize these credit card transactions into the provided categories. Return only valid JSON.

Categories: ${categories.join(', ')}

Transactions:
${transactions.map((t) => `- ${t}`).join('\n')}

Return format: {"transaction_description": "Category", ...}
Include every transaction. Use "Other" if unsure.

Important context:
- FARM BOY, RCSS, WAL-MART, LOBLAWS are grocery stores
- SQ *EQUATOR, SQ *BRIDGEHEAD, STARBUCKS are coffee shops
- UBER CANADA/UBEREATS, UBER EATS are food delivery
- American Eagle, Aerie, Old Navy are clothing stores
- PAYMENT - THANK YOU are credit card payments
- OVERLIMIT FEE, INTEREST CHARGE are fees and interest`;

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

    const content = response.content[0];
    if (content.type === 'text') {
      let textToParse = content.text;

      // Remove markdown code blocks if present
      textToParse = textToParse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to extract JSON object
      const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed categorizations:', parsed);
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

    const content = response.content[0];
    if (content.type === 'text') {
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
