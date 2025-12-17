import { useEffect, lazy, Suspense } from 'react';
import { useStore } from './store';
import { BackupReminder } from './components/common/BackupReminder';
import { AccountSelector } from './components/common/AccountSelector';

// Lazy load heavy components for better initial load performance
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const TransactionList = lazy(() => import('./components/transactions/TransactionList').then(m => ({ default: m.TransactionList })));
const UploadZone = lazy(() => import('./components/upload/UploadZone').then(m => ({ default: m.UploadZone })));
const Settings = lazy(() => import('./components/settings/Settings').then(m => ({ default: m.Settings })));
const Trends = lazy(() => import('./components/trends/Trends').then(m => ({ default: m.Trends })));

function App() {
  const { currentView, setCurrentView, loadData, isLoading } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background-alt/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-display font-bold text-primary">Budget Tracker</h1>
              <AccountSelector />
            </div>
            <div className="flex items-center gap-1">
              <NavButton
                active={currentView === 'dashboard'}
                onClick={() => setCurrentView('dashboard')}
              >
                Dashboard
              </NavButton>
              <NavButton
                active={currentView === 'transactions'}
                onClick={() => setCurrentView('transactions')}
              >
                Transactions
              </NavButton>
              <NavButton
                active={currentView === 'trends'}
                onClick={() => setCurrentView('trends')}
              >
                Trends
              </NavButton>
              <NavButton
                active={currentView === 'upload'}
                onClick={() => setCurrentView('upload')}
              >
                Import
              </NavButton>
              <NavButton
                active={currentView === 'settings'}
                onClick={() => setCurrentView('settings')}
              >
                Settings
              </NavButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-text-primary">Loading...</div></div>}>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'transactions' && <TransactionList />}
          {currentView === 'trends' && <Trends />}
          {currentView === 'upload' && <UploadZone />}
          {currentView === 'settings' && <Settings />}
        </Suspense>
      </main>

      {/* Backup Reminder */}
      <BackupReminder />
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function NavButton({ active, onClick, children }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded transition-all duration-200 font-medium ${
        active
          ? 'bg-primary text-background-alt font-display shadow-glow-sm'
          : 'text-text-secondary hover:text-text-primary hover:bg-muted/50'
      }`}
    >
      {children}
    </button>
  );
}

export default App;
