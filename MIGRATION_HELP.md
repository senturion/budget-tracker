# Database Migration Help

## Issue: Blank Dashboard After Account Type Refactor

If you're seeing a blank page when selecting specific accounts, it's because your existing accounts haven't been migrated to the new schema yet.

## Quick Fix Applied

I've updated the Dashboard component to fall back to the aggregated view for unmigrated accounts. Your dashboard should now work again, showing the old combined view.

## To See the New Account-Specific Dashboards

You have two options:

### Option 1: Edit Existing Accounts (Recommended)

1. Go to Settings → Account Management
2. Click "Edit" on each account
3. The form will now show account type selection (BANK or CREDIT_CARD)
4. Select the correct type for each account
5. Fill in any additional fields (for credit cards: credit limit, balance owed, etc.)
6. Save

Once accounts have an `accountType` set, they'll use the new specialized dashboards.

### Option 2: Clear Database and Start Fresh

If you want to test with a clean slate:

1. Open browser DevTools (F12)
2. Go to Application → Storage → IndexedDB
3. Delete "BudgetTrackerDB"
4. Refresh the page

This will trigger all migrations from scratch.

## What the New Dashboards Show

**Bank Account Dashboard:**
- Current & Available Balance
- Net Cash Flow
- Total Income (Earned + Passive)
- Total Spending
- Income breakdown chart
- Spending by category

**Credit Card Dashboard:**
- Balance Owed
- Available Credit
- Utilization Bar (color-coded)
- Statement dates & payment info
- Spend This Period
- Payments Made
- Interest & Fees charged
- Refunds

## Verification

To verify accounts are migrated, check in Settings → Account Management. You should see account type information displayed for each account.
