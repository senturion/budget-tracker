import { useState } from 'react';
import { useStore } from '../../store';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { v4 as uuidv4 } from 'uuid';
import type { Account, BankAccount, CreditCardAccount } from '../../types';
import { AccountType, BankAccountSubtype } from '../../types';

const ACCOUNT_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // green
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function AccountManagement() {
  const { accounts, addAccount, updateAccount, removeAccount, setDefaultAccount } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null); // For full edit mode

  // Form state
  const [accountType, setAccountType] = useState<AccountType>(AccountType.BANK);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);

  // Bank account fields
  const [subtype, setSubtype] = useState<BankAccountSubtype>(BankAccountSubtype.CHEQUING);
  const [currentBalance, setCurrentBalance] = useState('');
  const [availableBalance, setAvailableBalance] = useState('');

  // Credit card fields
  const [issuer, setIssuer] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [balanceOwed, setBalanceOwed] = useState('');
  const [statementDay, setStatementDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [aprPurchase, setAprPurchase] = useState('');

  const resetForm = () => {
    setName('');
    setInstitution('');
    setColor(ACCOUNT_COLORS[0]);
    setAccountType(AccountType.BANK);
    setSubtype(BankAccountSubtype.CHEQUING);
    setCurrentBalance('');
    setAvailableBalance('');
    setIssuer('');
    setCreditLimit('');
    setBalanceOwed('');
    setStatementDay('');
    setDueDay('');
    setAprPurchase('');
    setEditingAccountId(null);
  };

  const loadAccountForEdit = (account: Account) => {
    // Set common fields
    setName(account.name);
    setInstitution(account.institution || '');
    setColor(account.color);

    // Set account type and type-specific fields
    if (account.accountType === AccountType.BANK) {
      setAccountType(AccountType.BANK);
      setSubtype(account.subtype);
      setCurrentBalance(account.currentBalance?.toString() || '');
      setAvailableBalance(account.availableBalance?.toString() || '');
      // Clear credit card fields
      setIssuer('');
      setCreditLimit('');
      setBalanceOwed('');
      setStatementDay('');
      setDueDay('');
      setAprPurchase('');
    } else if (account.accountType === AccountType.CREDIT_CARD) {
      setAccountType(AccountType.CREDIT_CARD);
      setIssuer(account.issuer || '');
      setCreditLimit(account.creditLimit?.toString() || '');
      setBalanceOwed(account.currentBalance?.toString() || '');
      setStatementDay(account.statementDay?.toString() || '');
      setDueDay(account.dueDay?.toString() || '');
      setAprPurchase(account.aprPurchase?.toString() || '');
      // Clear bank fields
      setSubtype(BankAccountSubtype.CHEQUING);
      setCurrentBalance('');
      setAvailableBalance('');
    } else {
      // Unmigrated account - default to BANK type
      setAccountType(AccountType.BANK);
      setSubtype(BankAccountSubtype.CHEQUING);
      setCurrentBalance('');
      setAvailableBalance('');
      setIssuer('');
      setCreditLimit('');
      setBalanceOwed('');
      setStatementDay('');
      setDueDay('');
      setAprPurchase('');
    }

    setEditingAccountId(account.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Account name is required');
      return;
    }

    // Validation for credit cards
    if (accountType === AccountType.CREDIT_CARD) {
      const limitNum = creditLimit ? parseFloat(creditLimit) : undefined;
      const balanceNum = balanceOwed ? parseFloat(balanceOwed) : undefined;

      if (limitNum !== undefined && balanceNum !== undefined && balanceNum > limitNum) {
        alert('Balance owed cannot exceed credit limit');
        return;
      }

      const statementDayNum = statementDay ? parseInt(statementDay) : undefined;
      const dueDayNum = dueDay ? parseInt(dueDay) : undefined;

      if (statementDayNum && (statementDayNum < 1 || statementDayNum > 31)) {
        alert('Statement day must be between 1 and 31');
        return;
      }

      if (dueDayNum && (dueDayNum < 1 || dueDayNum > 31)) {
        alert('Due day must be between 1 and 31');
        return;
      }
    }

    if (editingAccountId) {
      // Update existing account
      let updatedAccountData: Partial<Account>;

      if (accountType === AccountType.BANK) {
        updatedAccountData = {
          name: name.trim(),
          accountType: AccountType.BANK,
          subtype,
          institution: institution.trim() || undefined,
          color,
          currentBalance: currentBalance ? parseFloat(currentBalance) : undefined,
          availableBalance: availableBalance ? parseFloat(availableBalance) : undefined,
        };
      } else {
        const limitNum = creditLimit ? parseFloat(creditLimit) : undefined;
        const balanceNum = balanceOwed ? parseFloat(balanceOwed) : undefined;

        updatedAccountData = {
          name: name.trim(),
          accountType: AccountType.CREDIT_CARD,
          issuer: issuer.trim() || undefined,
          institution: institution.trim() || undefined,
          color,
          creditLimit: limitNum,
          currentBalance: balanceNum,
          availableCredit: limitNum && balanceNum !== undefined ? limitNum - balanceNum : undefined,
          statementDay: statementDay ? parseInt(statementDay) : undefined,
          dueDay: dueDay ? parseInt(dueDay) : undefined,
          aprPurchase: aprPurchase ? parseFloat(aprPurchase) : undefined,
        };
      }

      await updateAccount(editingAccountId, updatedAccountData);
      resetForm();
      setShowForm(false);
    } else {
      // Create new account
      let newAccount: Account;

      if (accountType === AccountType.BANK) {
        const bankAccount: BankAccount = {
          id: uuidv4(),
          name: name.trim(),
          accountType: AccountType.BANK,
          subtype,
          institution: institution.trim() || undefined,
          currency: 'CAD',
          isActive: true,
          color,
          isDefault: accounts.length === 0,
          createdAt: new Date().toISOString(),
          currentBalance: currentBalance ? parseFloat(currentBalance) : undefined,
          availableBalance: availableBalance ? parseFloat(availableBalance) : undefined,
        };
        newAccount = bankAccount;
      } else {
        const limitNum = creditLimit ? parseFloat(creditLimit) : undefined;
        const balanceNum = balanceOwed ? parseFloat(balanceOwed) : undefined;
        const statementDayNum = statementDay ? parseInt(statementDay) : undefined;
        const dueDayNum = dueDay ? parseInt(dueDay) : undefined;

        const creditCardAccount: CreditCardAccount = {
          id: uuidv4(),
          name: name.trim(),
          accountType: AccountType.CREDIT_CARD,
          issuer: issuer.trim() || undefined,
          institution: institution.trim() || undefined,
          currency: 'CAD',
          isActive: true,
          color,
          isDefault: accounts.length === 0,
          createdAt: new Date().toISOString(),
          creditLimit: limitNum,
          currentBalance: balanceNum,
          availableCredit: limitNum && balanceNum !== undefined ? limitNum - balanceNum : undefined,
          statementDay: statementDayNum,
          dueDay: dueDayNum,
          aprPurchase: aprPurchase ? parseFloat(aprPurchase) : undefined,
        };
        newAccount = creditCardAccount;
      }

      await addAccount(newAccount);
      resetForm();
      setShowForm(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultAccount(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all transactions for this account.')) {
      await removeAccount(id);
    }
  };


  const getAccountDisplayInfo = (account: Account): string => {
    if (account.accountType === AccountType.BANK) {
      const subtypeLabel = account.subtype.charAt(0) + account.subtype.slice(1).toLowerCase();
      if (account.currentBalance !== undefined) {
        return `${subtypeLabel} • Balance: $${account.currentBalance.toFixed(2)}`;
      }
      return `${subtypeLabel} • No balance set`;
    } else {
      // Credit card
      if (account.currentBalance !== undefined && account.creditLimit) {
        return `Credit Card • Owed: $${account.currentBalance.toFixed(2)} / Limit: $${account.creditLimit.toFixed(2)}`;
      } else if (account.currentBalance !== undefined) {
        return `Credit Card • Owed: $${account.currentBalance.toFixed(2)}`;
      } else if (account.creditLimit) {
        return `Credit Card • Limit: $${account.creditLimit.toFixed(2)}`;
      }
      return 'Credit Card • No balance set';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-text-primary">Accounts</h3>
        <Button onClick={() => {
          if (showForm) {
            resetForm();
            setShowForm(false);
          } else {
            setShowForm(true);
          }
        }}>
          {showForm ? 'Cancel' : 'Add Account'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-background rounded-lg border border-border">
          <h4 className="text-md font-semibold text-text-primary mb-4">
            {editingAccountId ? 'Edit Account' : 'Create New Account'}
          </h4>
          <div className="space-y-4">
            {/* Account Type Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Account Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={AccountType.BANK}
                    checked={accountType === AccountType.BANK}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-text-primary">Bank Account</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={AccountType.CREDIT_CARD}
                    checked={accountType === AccountType.CREDIT_CARD}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-text-primary">Credit Card</span>
                </label>
              </div>
            </div>

            {/* Common Fields */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Account Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={accountType === AccountType.BANK ? "e.g., TD Chequing" : "e.g., Chase Visa"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Institution
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., TD Bank, Chase"
              />
            </div>

            {/* Bank-specific fields */}
            {accountType === AccountType.BANK && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Account Subtype
                  </label>
                  <select
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value as BankAccountSubtype)}
                    className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={BankAccountSubtype.CHEQUING}>Chequing</option>
                    <option value={BankAccountSubtype.SAVINGS}>Savings</option>
                    <option value={BankAccountSubtype.CASH}>Cash</option>
                    <option value={BankAccountSubtype.INVESTMENT_CASH}>Investment Cash</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Current Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentBalance}
                      onChange={(e) => setCurrentBalance(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Available Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={availableBalance}
                      onChange={(e) => setAvailableBalance(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Credit Card-specific fields */}
            {accountType === AccountType.CREDIT_CARD && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Issuer
                  </label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Visa, Mastercard"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Balance Owed
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={balanceOwed}
                      onChange={(e) => setBalanceOwed(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Statement Day (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={statementDay}
                      onChange={(e) => setStatementDay(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Due Day (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      APR (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={aprPurchase}
                      onChange={(e) => setAprPurchase(e.target.value)}
                      className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="19.99"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {ACCOUNT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button type="submit">{editingAccountId ? 'Save Changes' : 'Create Account'}</Button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <p className="text-text-muted text-sm">No accounts yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text-primary">{account.name}</h4>
                      {account.isDefault && (
                        <span className="text-amber-400 text-lg" title="Default account">
                          ★
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {account.institution ? `${account.institution} • ` : ''}
                      {getAccountDisplayInfo(account)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadAccountForEdit(account)}
                    className="text-xs px-3 py-1 rounded bg-primary hover:bg-primary/80 text-background-alt transition-colors"
                  >
                    Edit
                  </button>
                  {!account.isDefault && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80 text-text-primary transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="text-xs px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    disabled={accounts.length === 1}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
