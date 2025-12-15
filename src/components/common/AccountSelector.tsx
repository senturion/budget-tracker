import { useStore } from '../../store';

export function AccountSelector() {
  const { accounts, selectedAccountId, setSelectedAccountId } = useStore();

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <select
        value={selectedAccountId}
        onChange={(e) => setSelectedAccountId(e.target.value)}
        className="appearance-none bg-background-alt border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <option value="all">All Accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary">
        <svg
          className="h-4 w-4 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
}
