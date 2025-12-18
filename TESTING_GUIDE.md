# Testing Guide: Database Migration v6

## Quick Test Options

### Option 1: Test Page (Safest - No UI Dependencies)
1. Open `test-migration.html` in your browser
2. Click "Run Migration Test"
3. Click "Inspect Database"
4. Check console for migration logs

### Option 2: Browser DevTools (Manual Inspection)
1. Open the app in Chrome/Edge
2. Open DevTools (F12)
3. Go to **Application** tab → **IndexedDB** → **BudgetTrackerDB**
4. Check for these tables:
   - ✓ `merchants` - should have entries
   - ✓ `tags` - may be empty (no UI to create yet)
   - ✓ `transactionTags` - may be empty
5. Click `transactions` → inspect a record:
   - Should have `merchantId` field
   - May still have old `merchant` field (backwards compat)
   - Should have `tags` array (may be empty)
6. Click `budgets` → inspect a record:
   - Should have `type` field (probably "CATEGORY")
   - Should have `targetId` field

### Option 3: Console Commands (Interactive Testing)
Open browser console and run:

```javascript
// Get database instance
const db = window.indexedDB;

// Open BudgetTrackerDB
const request = indexedDB.open('BudgetTrackerDB');

request.onsuccess = (event) => {
  const db = event.target.result;
  console.log('Database version:', db.version);
  console.log('Object stores:', Array.from(db.objectStoreNames));

  // Check merchants
  const tx = db.transaction(['merchants'], 'readonly');
  const store = tx.objectStore('merchants');
  const merchantsReq = store.getAll();

  merchantsReq.onsuccess = () => {
    console.log('Merchants:', merchantsReq.result);
  };
};
```

## What to Look For

### ✓ Success Indicators
- Database version = 6
- Console logs show: "v6 migration complete"
- `merchants` table has records (one per unique merchant)
- All transactions have `merchantId`
- Budgets have `type` and `targetId` fields
- App loads without errors (may have display issues, but no crashes)

### ✗ Failure Indicators
- Console errors about missing fields
- Database version stuck at 5 or below
- Empty `merchants` table when you have transactions
- Transactions missing `merchantId`
- App crashes on load

## Expected Console Output

```
Starting v6 migration: merchants, tags, and enhanced budgets
Creating 47 merchant entities
Migrating 3 merchant rules
Migrating 5 budgets to new schema
v6 migration complete
```

## Known Issues During Testing

### Issue: UI shows `[object Object]` for merchants
**Cause**: UI code still expects `transaction.merchant` string
**Fix**: Use compatibility helper (already created)
**Impact**: Display only - data is fine

### Issue: Can't create tags or manage merchants
**Cause**: No UI for these features yet (Phase 3-4)
**Fix**: Coming in next phases
**Impact**: Features not accessible, but data model ready

### Issue: Budgets don't support new types
**Cause**: Budget UI not updated yet (Phase 5)
**Fix**: Coming in Phase 5
**Impact**: Can only create CATEGORY budgets for now

## Rollback Instructions

If migration fails or you want to start over:

### Method 1: Clear and Re-import
```javascript
// In browser console
indexedDB.deleteDatabase('BudgetTrackerDB');
// Then refresh page and import your backup
```

### Method 2: Restore from Backup
1. Go to Settings → Import Data
2. Upload your pre-migration backup
3. Refresh the page

## Testing Checklist

- [ ] Backup data first (Settings → Export Data)
- [ ] Open DevTools console before refreshing
- [ ] Refresh app, watch for migration logs
- [ ] Check IndexedDB has new tables
- [ ] Verify merchants table populated
- [ ] Check transaction record has merchantId
- [ ] Check budget record has type/targetId
- [ ] Test export (should include merchants, tags)
- [ ] Test import of export
- [ ] Verify app doesn't crash (display issues OK)

## Next Steps After Successful Test

1. ✓ Migration successful → Ready for Phase 2 (Category UI)
2. ✗ Migration failed → Report issue with console logs
3. ⚠️ Partial success → Review specific issues

## Getting Help

If migration fails:
1. Export console logs (right-click in console → Save as...)
2. Export your database backup
3. Share both for debugging
4. DO NOT clear database until backup confirmed

## Advanced: Query Examples

After migration succeeds, try these queries in console:

```javascript
// Import storage module
import('  /src/services/storage.js').then(async ({ getMerchants, getTags, getMerchantById }) => {
  // Get all merchants
  const merchants = await getMerchants();
  console.log('Total merchants:', merchants.length);

  // Find specific merchant
  const amazon = merchants.find(m => m.name.includes('Amazon'));
  console.log('Amazon merchant:', amazon);

  // Get all tags
  const tags = await getTags();
  console.log('Tags:', tags);
});
```
