import { useState } from 'react';
import { useStore } from '../../store';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { v4 as uuidv4 } from 'uuid';
import type { Account } from '../../types';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [formData, setFormData] = useState<Partial<Account>>({
    name: '',
    type: 'credit',
    institution: '',
    color: ACCOUNT_COLORS[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      return;
    }

    const newAccount: Account = {
      id: uuidv4(),
      name: formData.name,
      type: formData.type || 'credit',
      institution: formData.institution,
      color: formData.color || ACCOUNT_COLORS[0],
      isDefault: accounts.length === 0, // First account is default
      createdAt: new Date().toISOString(),
    };

    await addAccount(newAccount);
    setFormData({ name: '', type: 'credit', institution: '', color: ACCOUNT_COLORS[0] });
    setShowForm(false);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultAccount(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all transactions for this account.')) {
      await removeAccount(id);
    }
  };

  const handleStartEdit = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (editName.trim()) {
      await updateAccount(id, { name: editName.trim() });
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-text-primary">Accounts</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Account'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-background rounded-lg border border-border">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Account Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Chase Visa, TD Checking"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Account Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="credit">Credit Card</option>
                <option value="debit">Debit Card</option>
                <option value="checking">Checking Account</option>
                <option value="savings">Savings Account</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Institution (Optional)
              </label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full px-3 py-2 bg-background-alt border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Chase, TD Bank"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button type="submit">Create Account</Button>
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
                      {editingId === account.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(account.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="px-2 py-1 bg-background-alt border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                      ) : (
                        <h4 className="font-medium text-text-primary">{account.name}</h4>
                      )}
                      {account.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {account.institution ? `${account.institution} • ` : ''}
                      {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingId === account.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(account.id)}
                        className="text-xs px-3 py-1 rounded bg-primary hover:bg-primary/80 text-background-alt transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80 text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(account)}
                        className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80 text-text-primary transition-colors"
                      >
                        Rename
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
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
