# Budget Tracker

A personal finance tracking web application that uses Claude API for intelligent transaction categorization. Built for Spencer Callaghan's family budget tracking needs.

## Features

- **CSV Upload**: Import credit card transactions from CSV files
- **AI-Powered Categorization**: Automatic transaction categorization using Claude Sonnet 4
- **Smart Merchant Rules**: Learns from categorizations to auto-classify future transactions
- **Dashboard**: Monthly spending overview with category breakdowns
- **Advanced Trends & Analytics**: Interactive charts and spending pattern analysis
- **Transaction Management**: Search, filter, and manually recategorize transactions
- **Budget Tracking**: Set budgets per category with alert thresholds
- **Month-over-Month Comparison**: Track spending trends
- **Local Data Storage**: All data stored in browser IndexedDB
- **Dark Theme**: Professional dark UI with amber accents

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Storage**: IndexedDB via Dexie.js
- **CSV Parsing**: Papa Parse
- **Charts**: Recharts
- **AI Integration**: Anthropic Claude API (Sonnet 4)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An Anthropic API key (get one at https://console.anthropic.com/)

### Installation

1. Install dependencies (already done):
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser to http://localhost:5173

### First-Time Setup

1. **Add API Key**: Navigate to Settings and enter your Claude API key
2. **Import Transactions**: Upload your CSV file
3. **Review Dashboard**: View your spending breakdown

## CSV Format

The app expects CSV files in this format:
\`\`\`
date,description,charge,credit,balance
10/20/2025,FARM BOY #65,49.37,,26345.91
10/23/2025,PAYMENT - THANK YOU,,250.00,26587.87
\`\`\`

## Default Categories

- Groceries
- Coffee
- Restaurants & Dining
- Food Delivery
- Clothing & Apparel
- Kids & Family
- Entertainment
- Subscriptions & Recurring
- Transportation & Gas
- Home & Household
- Health & Pharmacy
- Pets
- Amazon
- Payments & Credits
- Fees & Interest
- Other

## Key Features

### AI Categorization
- Claude analyzes transaction descriptions
- Automatically creates merchant rules
- Future matching transactions auto-categorized
- Manual override available

### Duplicate Detection
- Automatically detects duplicates
- Based on date + description + amount

### Month Navigation
- Navigate between months
- Compare to previous month

### Trends & Analytics
- **Spending Over Time**: Interactive area charts showing spending vs payments over 6, 12, or 24 months
- **Category Trends**: Stacked bar charts comparing category spending patterns over time
- **Top Merchants**: Ranked list of merchants by total spending with transaction counts and averages
- **Spending Patterns**:
  - Day of week analysis to identify spending habits
  - Time of month breakdown (early/mid/late month patterns)
- **Category Insights**: Trend indicators showing which categories are increasing, decreasing, or stable
- **Summary Statistics**: Total spending, average monthly spending, and transaction counts

### Budget Management
- Create budgets for specific categories
- Set custom alert thresholds (e.g., warning at 80% of budget)
- Visual budget status with progress indicators
- Automatic alerts when approaching or exceeding budgets

## Data Management

- **Export**: Download all data as JSON backup
- **Import**: Restore from JSON backup
- **Clear**: Permanently delete all data

## Building for Production

\`\`\`bash
npm run build
\`\`\`

## Privacy & Security

- All data stays in your browser
- API key only sent to Anthropic API
- No cloud dependencies
- Perfect for personal use

## License

Personal use project.
