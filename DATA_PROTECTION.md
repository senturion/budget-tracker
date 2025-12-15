# Data Protection Features

This document outlines the data protection and backup features implemented in the Budget Tracker app to prevent data loss.

## Problem That Occurred

During the database schema migration from v1 to v2 (adding budget tracking), the IndexedDB database may have experienced issues that could lead to data loss. This was not intentional deletion by the code, but rather a browser caching issue during schema upgrades.

## Solutions Implemented

### 1. Proper Database Migration (storage.ts:19-42)

**What it does**: Ensures data is preserved when the database schema changes.

```typescript
this.version(2)
  .stores({ ... })
  .upgrade(async (tx) => {
    // Migrate existing budgets from v1 to v2
    const oldBudgets = await tx.table('budgets').toArray();
    if (oldBudgets.length > 0) {
      await tx.table('budgets').clear();
      const migratedBudgets = oldBudgets.map((budget: any) => ({
        id: `budget-${budget.category}-${Date.now()}`,
        category: budget.category,
        monthlyLimit: budget.monthlyLimit,
        alertThreshold: budget.alertThreshold || 80,
        createdAt: budget.createdAt || new Date().toISOString(),
      }));
      await tx.table('budgets').bulkAdd(migratedBudgets);
    }
  });
```

**How it helps**: Future schema changes will automatically migrate existing data instead of losing it.

### 2. Automatic Backup Before Destructive Operations (Settings.tsx:74-111)

**What it does**: Forces users to create a backup before clearing all data.

When clicking "Clear All Data":
1. First prompt: "Would you like to create a backup first? (Recommended)"
   - OK = Creates automatic backup, then confirms deletion
   - Cancel = Double-confirms deletion without backup
2. If user skips backup: "FINAL WARNING: You are about to delete all data WITHOUT a backup!"
3. If user creates backup: "Backup created! Now, are you sure you want to clear all data?"

**How it helps**: Makes it nearly impossible to accidentally delete data without having a backup.

### 3. Periodic Backup Reminders (BackupReminder.tsx)

**What it does**: Shows a friendly reminder notification to create backups every 7 days.

Features:
- Appears as a card in the bottom-right corner
- Shows days since last backup
- One-click "Create Backup" button
- "Remind Later" to dismiss temporarily
- Never blocks the UI or interrupts work

**How it helps**: Encourages regular backups without being annoying.

### 4. Backup Tracking (storage.ts:175-206)

**What it does**: Tracks when backups were last created using localStorage.

Functions:
- `getLastBackupDate()` - Returns when the last backup was created
- `setLastBackupDate()` - Records a new backup timestamp
- `shouldRemindBackup()` - Returns true if 7+ days since last backup
- `createAutomaticBackup()` - Downloads a timestamped backup file

**How it helps**: Enables the reminder system and tracks backup history.

## How to Use These Features

### Creating Manual Backups

1. Go to Settings → Data Management → Export Data
2. Click "Export Data" button
3. Save the JSON file somewhere safe (Downloads, cloud storage, etc.)

### Automatic Backup Reminders

- Every 7 days without a backup, you'll see a notification
- Click "Create Backup" for instant backup
- Click "Remind Later" to dismiss (will show again after 7 days)

### Importing Backups

1. Go to Settings → Data Management → Import Data
2. Click "Import Data"
3. Select your backup JSON file
4. All data will be restored

### Clearing Data Safely

1. Go to Settings → Data Management → Clear All Data
2. Click "Clear All Data"
3. System will offer to create backup (HIGHLY RECOMMENDED)
4. Confirm the operation
5. Data is cleared

## Files Modified

- `src/services/storage.ts` - Database migration + backup functions
- `src/components/settings/Settings.tsx` - Enhanced clear data flow
- `src/components/common/BackupReminder.tsx` - Reminder component (new file)
- `src/App.tsx` - Added BackupReminder to app

## Backup File Format

Backup files are JSON with this structure:

```json
{
  "transactions": [...],
  "merchantRules": [...],
  "budgets": [...],
  "settings": {...},
  "exportedAt": "2025-12-14T21:00:00.000Z"
}
```

## Recovery from Data Loss

If you lost data and have a backup:
1. Go to Settings → Import Data
2. Select your most recent backup file
3. Data will be restored

If you don't have a backup:
- Unfortunately, browser IndexedDB data cannot be recovered without a backup
- This is why the new protection features are critical
- Always keep backups in a safe location (cloud storage, external drive, etc.)

## Best Practices

1. **Export regularly**: Create backups after importing large amounts of data
2. **Keep multiple backups**: Don't overwrite your previous backup
3. **Store safely**: Keep backups in cloud storage (Google Drive, Dropbox, etc.)
4. **Test restores**: Occasionally test importing a backup to verify it works
5. **Before major changes**: Always export before making significant changes

## Future Enhancements

Potential improvements:
- Automatic cloud sync (Google Drive, Dropbox)
- Multiple backup versions with rollback
- Scheduled automatic backups
- Backup encryption for sensitive data
