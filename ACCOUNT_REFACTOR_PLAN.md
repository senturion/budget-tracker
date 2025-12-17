# Account Type Refactoring - Implementation Plan

## Status: Ready for Review

This plan outlines the complete refactoring needed to properly distinguish bank accounts from credit cards, ensuring correct metrics, no double-counting, and clear semantics.

---

## ✅ Phase 1: Core Types & Database (COMPLETED)

### 1.1 Type Definitions ✅
- [x] Created `AccountType` enum (BANK, CREDIT_CARD)
- [x] Created `BankAccountSubtype` enum
- [x] Defined `BankAccount` interface with asset-specific fields
- [x] Defined `CreditCardAccount` interface with liability-specific fields
- [x] Created union type `Account`

**File:** `src/types/index.ts`

### 1.2 Database Migration ✅
- [x] Created version 5 migration in storage.ts
- [x] Migrates old `type: 'credit' | 'debit'` → `accountType: BANK | CREDIT_CARD`
- [x] Adds `currency`, `isActive` fields
- [x] Maps old types to new subtypes

**File:** `src/services/storage.ts`

### 1.3 Account Metrics Utilities ✅
- [x] Created `calculateBankAccountMetrics()` - net cash flow, income, spending
- [x] Created `calculateCreditCardMetrics()` - balance owed, payments, utilization
- [x] Created global reporting filters to prevent double-counting
- [x] Functions: `getGlobalSpending()`, `getGlobalIncome()`, `getCreditCardPayments()`

**File:** `src/utils/accountMetrics.ts` (NEW)

---

## 🔄 Phase 2: Account Management UI (IN PROGRESS)

### 2.1 Update AccountManagement Component
**File:** `src/components/settings/AccountManagement.tsx`

**Required Changes:**

```typescript
// Form needs to differentiate account types
const [accountType, setAccountType] = useState<AccountType>(AccountType.BANK);

// Bank account form fields:
- name
- subtype (CHEQUING, SAVINGS, CASH, INVESTMENT_CASH)
- institution
- currentBalance (optional)
- availableBalance (optional)
- color

// Credit card form fields:
- name
- issuer
- creditLimit (optional)
- currentBalance (optional - amount owed)
- statementDay (1-31)
- dueDay (1-31)
- aprPurchase (optional)
- color
```

**UI Structure:**
1. Radio buttons to select BANK vs CREDIT_CARD
2. Conditional form fields based on selection
3. Display existing accounts with type-specific info:
   - Bank: "Balance: $X,XXX" or "No balance set"
   - Credit Card: "Balance Owed: $X,XXX | Limit: $X,XXX" or "No balance set"

**Validation:**
- Credit card balance should not exceed credit limit
- Statement day and due day should be 1-31
- APR should be 0-100%

---

## 🔄 Phase 3: Dashboard Refactoring (PENDING)

### 3.1 Create Account-Specific Dashboard Components

#### Option A: Separate Components
```
src/components/dashboard/
  ├── Dashboard.tsx (router - renders appropriate dashboard)
  ├── BankAccountDashboard.tsx (NEW)
  └── CreditCardDashboard.tsx (NEW)
```

#### Option B: Conditional Rendering in Single Component
Keep `Dashboard.tsx` but render different sections based on `account.accountType`

**Recommendation:** Option A for cleaner separation

### 3.2 Bank Account Dashboard
**File:** `src/components/dashboard/BankAccountDashboard.tsx` (NEW)

**Header:**
```
┌─────────────────────────────────────────┐
│ [Icon] Account Name · Institution       │
│ Current Balance: $X,XXX.XX              │
│ Available: $X,XXX.XX (if set)           │
└─────────────────────────────────────────┘
```

**KPI Cards:**
- Net Cash Flow (period): +$X,XXX / -$X,XXX
- Total Income (EARNED + PASSIVE): $X,XXX
- Total Spending (EXPENSE only): $X,XXX

**Visuals:**
- Cash flow over time (line chart)
- Spending by category (bar chart)
- Income breakdown (earned vs passive)

**Transaction List:**
- Show EXPENSE and INFLOW by default
- Toggle to show/hide TRANSFER
- Label transfers clearly: "Transfer to [Account Name]"

### 3.3 Credit Card Dashboard
**File:** `src/components/dashboard/CreditCardDashboard.tsx` (NEW)

**Header:**
```
┌─────────────────────────────────────────┐
│ [CC Icon] Card Name · Issuer            │
│ Balance Owed: $X,XXX.XX                 │
│ Available Credit: $X,XXX.XX             │
│ ▓▓▓▓▓▓░░░░ 60% Utilization             │
└─────────────────────────────────────────┘
```

**Statement Block:**
```
┌─────────────────────────────────────────┐
│ Statement Closes: 15th of each month    │
│ Payment Due: 10th of each month         │
│ Minimum Payment: $XXX.XX                │
│ Status: [OK / DUE SOON / OVERDUE]       │
└─────────────────────────────────────────┘
```

**KPI Cards:**
- Spend This Period: $X,XXX
- Payments Made: $X,XXX
- Interest Charged: $XXX
- Fees Charged: $XX

**Visuals:**
- Spending over time (line chart)
- Spending by category (bar chart)
- Utilization history (if historical data available)

**Transaction List:**
- **Purchases** section (EXPENSE)
- **Payments** section (TRANSFER with toAccountId = this card)
- **Refunds** section (INFLOW with REIMBURSEMENT)
- Label clearly:
  - "Purchase" (not "expense")
  - "Payment (Transfer from [Account])"
  - "Refund (reduces spending)"

### 3.4 Update Main Dashboard Router
**File:** `src/components/dashboard/Dashboard.tsx`

```typescript
export const Dashboard: React.FC = () => {
  const { selectedAccountId, accounts } = useStore();

  const currentAccount = accounts.find(a => a.id === selectedAccountId);

  if (!currentAccount) {
    return <NoAccountSelected />;
  }

  if (currentAccount.accountType === AccountType.BANK) {
    return <BankAccountDashboard account={currentAccount} />;
  } else {
    return <CreditCardDashboard account={currentAccount} />;
  }
};
```

---

## 🔄 Phase 4: Transaction Filtering Updates (PENDING)

### 4.1 Update Global Calculations
**Files to update:**
- `src/utils/calculations.ts`
- `src/utils/financialCalculations.ts`

**Changes:**
- Replace direct transaction filtering with calls to `accountMetrics.ts` functions
- Use `getGlobalSpending()` instead of manual EXPENSE filtering
- Use `getGlobalIncome()` for income totals
- Ensure TRANSFER transactions never count toward spending/income

### 4.2 Update Transaction List
**File:** `src/components/transactions/TransactionList.tsx`

**Labeling:**
```typescript
function getTransactionLabel(tx: Transaction, accounts: Account[]): string {
  if (tx.type === TransactionType.EXPENSE) {
    const account = accounts.find(a => a.id === tx.accountId);
    if (account?.accountType === AccountType.CREDIT_CARD) {
      return 'Purchase';
    }
    return 'Expense';
  }

  if (tx.type === TransactionType.TRANSFER) {
    const toAccount = accounts.find(a => a.id === tx.toAccountId);
    const fromAccount = accounts.find(a => a.id === tx.accountId);
    return `Payment (${fromAccount?.name} → ${toAccount?.name})`;
  }

  if (tx.type === TransactionType.INFLOW && tx.incomeClass === IncomeClass.REIMBURSEMENT) {
    return 'Refund (reduces spending)';
  }

  return 'Income';
}
```

### 4.3 Update Trends Page
**File:** `src/components/trends/Trends.tsx`

**Changes:**
- Filter out TRANSFER when calculating spending trends
- Add separate section for "Credit Card Payments" if desired
- Ensure refunds don't inflate income numbers

---

## 🔄 Phase 5: CSV Import Updates (PENDING)

### 5.1 Update Upload Zone
**File:** `src/components/upload/UploadZone.tsx`

**Changes:**
- Show account type when selecting import target
- For credit cards, remind user: "Credit card payments should be imported as transfers, not expenses"
- Consider adding import presets:
  - "Bank Statement" (EXPENSE/INFLOW)
  - "Credit Card Statement" (EXPENSE on card, TRANSFER for payments)

### 5.2 CSV Parser (Already Correct)
**File:** `src/services/csvParser.ts`

✅ Already handles positive/negative amounts correctly
✅ Creates EXPENSE for charges, INFLOW for credits
✅ No changes needed - account type context is provided by selected account

---

## 🔄 Phase 6: Store Updates (PENDING)

### 6.1 Update Zustand Store
**File:** `src/store/index.ts`

**Changes:**
```typescript
// Add type-safe account helpers
const isBankAccount = (account: Account): account is BankAccount => {
  return account.accountType === AccountType.BANK;
};

const isCreditCardAccount = (account: Account): account is CreditCardAccount => {
  return account.accountType === AccountType.CREDIT_CARD;
};

// Update addAccount to handle both types
addAccount: (account: Account) => {
  // Validate based on type
  if (isCreditCardAccount(account)) {
    // Validate credit card fields
    if (account.creditLimit && account.currentBalance) {
      if (account.currentBalance > account.creditLimit) {
        throw new Error('Balance owed cannot exceed credit limit');
      }
    }
  }
  // ... rest of logic
}
```

---

## 🔄 Phase 7: Testing & Validation (PENDING)

### 7.1 Create Test Scenarios

**Scenario 1: Bank Account Only**
- Add chequing account
- Import transactions (expenses + income)
- Verify net cash flow = income - expenses
- Verify no double-counting

**Scenario 2: Credit Card Only**
- Add credit card
- Import purchases
- Verify spending totals match
- Verify no balance tracking issues

**Scenario 3: Bank + Credit Card + Transfers**
- Add both account types
- Import transactions on both
- Create TRANSFER from bank → credit card (payment)
- Verify:
  - Transfer does NOT count as expense
  - Transfer reduces credit card balance
  - Transfer reduces bank balance
  - Global spending = CC purchases + bank expenses (no transfers)

**Scenario 4: Refunds on Credit Card**
- Add INFLOW transaction with REIMBURSEMENT on credit card
- Verify it reduces spending for that category
- Verify it doesn't inflate income totals

### 7.2 Build & Type Check
```bash
npm run build
# Must pass with no TypeScript errors
```

### 7.3 Manual Testing Checklist
- [ ] Create bank account
- [ ] Create credit card account
- [ ] Import transactions to each
- [ ] Create payment transfer
- [ ] View bank dashboard
- [ ] View credit card dashboard
- [ ] Check global Trends page
- [ ] Verify no double-counting in totals

---

## 📊 Migration Impact Analysis

### Breaking Changes
1. **Account interface completely changed**
   - Old: `type: 'credit' | 'debit' | ...`
   - New: `accountType: 'BANK' | 'CREDIT_CARD'` + specific interfaces

2. **Dashboard rendering logic**
   - Old: Single dashboard for all accounts
   - New: Different dashboards per account type

3. **Transaction labeling**
   - Old: "Expense" for everything negative
   - New: "Purchase" on CC, "Payment (Transfer)" for CC payments

### Data Safety
- ✅ Database migration (v5) handles all existing accounts
- ✅ No transaction data is lost
- ✅ All calculations remain backward compatible

### Performance Impact
- Minimal - same number of queries
- Code splitting already in place
- Lazy loading dashboards would further improve

---

## 🎯 Recommended Implementation Order

1. **Phase 2: Account Management UI** (1-2 hours)
   - Get account creation working with new types
   - Essential for testing everything else

2. **Phase 6: Store Updates** (30 min)
   - Add validation and helper functions
   - Required before creating accounts

3. **Phase 3: Dashboard Refactoring** (2-3 hours)
   - Create BankAccountDashboard.tsx
   - Create CreditCardDashboard.tsx
   - Update Dashboard.tsx router

4. **Phase 4: Transaction Filtering** (1 hour)
   - Update calculations to use accountMetrics.ts
   - Update transaction list labeling

5. **Phase 5: CSV Import** (30 min)
   - Minor UI updates for clarity

6. **Phase 7: Testing** (1 hour)
   - Run build
   - Manual testing
   - Fix any issues

**Total Estimated Time:** 6-8 hours

---

## 🚨 Risk Areas

1. **Type Errors**: Many components reference old `Account` interface
   - **Mitigation**: TypeScript will catch these at build time

2. **Data Migration**: Existing accounts must migrate correctly
   - **Mitigation**: Version 5 migration is tested and handles all cases

3. **Double-Counting**: Transfers might be counted as expenses
   - **Mitigation**: Strict use of `affectsSpending()` and `affectsIncome()` helpers

4. **UI Confusion**: Users might not understand new account types
   - **Mitigation**: Clear labeling ("Purchase" vs "Payment"), tooltips

---

## 📝 Open Questions for Review

1. **Dashboard approach**: Separate components (Option A) or conditional rendering (Option B)?
   - **Recommendation**: Option A for cleaner code

2. **Balance tracking**: Should we calculate balances from transactions or rely on manual entry?
   - **Current**: Optional manual entry
   - **Alternative**: Auto-calculate from transactions

3. **Multi-account view**: Do we want a "All Accounts" dashboard that aggregates?
   - **Current**: Shows aggregated data when "All Accounts" selected
   - **Proposed**: Keep this behavior but ensure no double-counting

4. **Transfer UI**: How should users create transfers between accounts?
   - **Current**: Manual transaction creation
   - **Proposed**: Add "Transfer" button in both dashboards

---

## ✅ Decision Points

**Please review and approve/modify:**

- [ ] Phase implementation order looks good
- [ ] Dashboard approach: Separate components vs conditional rendering
- [ ] Transaction labeling ("Purchase", "Payment", "Refund") is clear
- [ ] Ready to proceed with implementation
- [ ] Any changes to the plan needed?

**Once approved, I'll proceed with full implementation following this plan.**
