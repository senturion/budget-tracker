# Quick Start Guide

## You're ready to go! The app is running at http://localhost:5174/

## Steps to Use Your Budget Tracker:

### 1. Configure API Key (First Time Only)
1. Open http://localhost:5174/
2. Click **Settings** in the navigation
3. Enter your Claude API key (starts with `sk-ant-...`)
4. Click **Save & Test API Key**
5. Wait for success message

### 2. Import Your Transactions
1. Click **Import** in the navigation
2. Drag and drop your CSV file: `/Users/spencer/Downloads/accountactivity.csv`
   - Or click "Choose File" to browse
3. Wait for the app to:
   - Parse the CSV
   - Categorize transactions with AI
   - Save to local database
4. You'll see a preview of imported transactions

### 3. View Your Dashboard
1. Click **Dashboard** in the navigation
2. See your spending summary:
   - Total spending
   - Total payments
   - Net change
   - Category breakdown
3. Use the month navigation arrows to view different months
4. Click on categories to see details

### 4. Manage Transactions
1. Click **Transactions** in the navigation
2. Search or filter transactions
3. Click on any category pill to change it
4. Sort by date or amount

## Your CSV File Location

The test CSV file is at:
`/Users/spencer/Downloads/accountactivity.csv`

This contains transactions from October-December 2025.

## Tips

- The app learns from your categorizations
- Merchant rules are created automatically
- All data is stored locally in your browser
- Export your data regularly from Settings

## Stopping the Dev Server

Press Ctrl+C in the terminal to stop the server.

## Rebuilding

If you make changes to the code:
```bash
npm run build
```

Enjoy tracking your budget!
