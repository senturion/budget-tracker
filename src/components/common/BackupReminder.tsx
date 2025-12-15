import React, { useState, useEffect } from 'react';
import { shouldRemindBackup, getLastBackupDate, createAutomaticBackup } from '../../services/storage';

export const BackupReminder: React.FC = () => {
  const [showReminder, setShowReminder] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  useEffect(() => {
    // Check if we should show reminder
    if (shouldRemindBackup()) {
      setShowReminder(true);
    }
  }, []);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await createAutomaticBackup();
      setShowReminder(false);
    } catch (error) {
      alert('Failed to create backup. Please try again.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDismiss = () => {
    setShowReminder(false);
  };

  if (!showReminder) return null;

  const lastBackup = getLastBackupDate();
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-primary/10 backdrop-blur-md border border-primary/30 rounded-lg p-4 shadow-glow-md">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-primary flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-primary font-semibold mb-1">Backup Reminder</h3>
            <p className="text-text-secondary text-sm mb-3">
              {lastBackup
                ? `It's been ${daysSinceBackup} days since your last backup. `
                : 'You haven\'t created a backup yet. '}
              Protect your data by creating a backup now.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="px-3 py-1.5 bg-primary text-background rounded text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-muted/50 text-text-secondary rounded text-sm font-medium hover:bg-muted transition-colors"
              >
                Remind Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
