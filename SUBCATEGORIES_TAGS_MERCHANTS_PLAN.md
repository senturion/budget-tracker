# Subcategories, Tags, and Enhanced Merchants - Implementation Plan

## Overview
This plan adds three major enhancements to the budget tracker:
1. **Subcategories** - Hierarchical organization beneath categories
2. **Tags** - Cross-cutting classification system
3. **Enhanced Merchants** - First-class merchant management

## Current State Analysis

### Existing Data Model
- **Categories**: Flat string list in `settings.defaultCategories`
- **Merchants**: Basic string field on transactions, with `MerchantRule` for auto-categorization
- **Budgets**: Tied to single category string
- **Dashboard**: Shows category-level aggregation via `CategorySpending`

### Key Files
- `src/types/index.ts` - Core type definitions
- `src/services/storage.ts` - Dexie database schema (v4)
- `src/components/dashboard/SpendingBreakdown.tsx` - Category display
- `src/utils/financialCalculations.ts` - Aggregation logic
- `src/components/settings/Settings.tsx` - Category management UI

## Design Decisions

### 1. Data Model Approach

#### Category Hierarchy
**Approach**: Use delimiter-based encoding (e.g., "Food > Restaurants > Fast Food")

**Why**:
- Backwards compatible - existing categories work as top-level
- Simple to implement - no complex schema changes
- Easy to parse and display
- Flexible depth (though we'll recommend 2 levels max for UX)

**Alternative Considered**: Separate `categories` and `subcategories` tables
- **Rejected**: More complex migrations, harder queries, breaks existing budget/transaction references

#### Tag System
**Approach**: New `tags` table + junction table `transaction_tags`

**Why**:
- Many-to-many relationship required
- Tags are fundamentally different from categories (multi-select vs single-select)
- Clean separation of concerns

**Schema**:
```typescript
interface Tag {
  id: string;
  name: string;
  color: string; // hex color for visual distinction
  createdAt: string;
}

interface TransactionTag {
  transactionId: string;
  tagId: string;
}
```

#### Merchant Entity
**Approach**: Promote merchants to first-class entities with their own table

**Why**:
- Enable merchant-specific budgets and tracking
- Allow merchant aliases/normalization (e.g., "AMZN" → "Amazon")
- Support merchant-level statistics and trends
- Better merchant rule management

**Schema**:
```typescript
interface Merchant {
  id: string;
  name: string; // Display name
  aliases: string[]; // Alternative names (for matching CSV imports)
  category?: string; // Default category for this merchant
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Enhanced Transaction (change merchant field)
interface Transaction {
  // ... existing fields
  merchantId: string; // Changed from merchant: string
  // ... existing fields
}

// Enhanced MerchantRule
interface MerchantRule {
  id: string;
  merchantId: string; // Link to Merchant entity
  category: string;
  createdAt: string;
}
```

### 2. Database Migration Strategy

**New Schema Version**: v5

**Migration Steps**:
1. Create new tables: `merchants`, `tags`, `transaction_tags`
2. Migrate existing merchant strings:
   - Extract unique merchant names from transactions
   - Create `Merchant` records
   - Update transactions to use `merchantId`
3. Preserve existing merchant rules, update to use `merchantId`

**Backwards Compatibility**:
- Keep existing category strings (add subcategory support via delimiter)
- Transaction.merchant field changes from string to merchantId (breaking change, requires migration)

### 3. UI/UX Design

#### Subcategories

**Dashboard View**:
- Top level shows parent categories only (current behavior preserved)
- Click category → drill-down modal/view showing subcategory breakdown
- Breadcrumb navigation for hierarchy

**Category Management** (Settings):
- Tree view for creating/editing categories
- Drag-and-drop to reorganize
- Validation: max 2-3 levels deep

**Transaction Editor**:
- Hierarchical dropdown (e.g., Food > Restaurants > Fast Food)
- Type-ahead search across all levels

#### Tags

**Tag Management** (Settings):
- Create/edit/delete tags
- Color picker for visual distinction
- List of tags with usage counts

**Transaction View**:
- Tag pills displayed on transaction rows
- Multi-select tag picker in transaction editor
- Filter by tag in transaction list

**Dashboard Integration**:
- New "Tagged Transactions" widget
- Tag-based spending analysis (separate view from categories)

#### Enhanced Merchants

**Merchant Management** (New Settings Section):
- List of all merchants with stats (total spent, transaction count)
- Edit merchant:
  - Display name
  - Aliases (for import matching)
  - Default category
  - Notes
- Search and filter merchants
- Merge merchants (combine duplicates)

**Dashboard Integration**:
- Enhanced "Top Merchants" (already exists in Trends)
- Click merchant → see all transactions
- Merchant-specific budgets (optional)

**Transaction View**:
- Click merchant → merchant detail view
- Merchant autocomplete in editor (shows existing merchants)

### 4. Budget System Enhancements

**Support for**:
1. Category budgets (existing - works with parent category)
2. Subcategory budgets (new - specific subcategory)
3. Tag budgets (new - budget for tagged transactions)
4. Merchant budgets (new - budget for specific merchant)

**Schema**:
```typescript
interface Budget {
  id: string;
  type: 'category' | 'subcategory' | 'tag' | 'merchant'; // NEW
  targetId: string; // category name, tag id, or merchant id
  monthlyLimit: number;
  alertThreshold: number;
  accountId?: string;
  createdAt: string;
}
```

### 5. AI Categorization Updates

**Subcategories**:
- Update prompts to suggest subcategories when available
- Format: "Food > Restaurants > Fast Food"
- AI can suggest new subcategories

**Tags**:
- Separate AI call to suggest tags based on description
- Tag suggestions: "recurring", "business", "tax-deductible", "gift", etc.

**Merchants**:
- AI suggests merchant name normalization
- Merchant alias detection

## Implementation Plan

### Phase 1: Database & Core Types (Foundation)
**Files**:
- `src/types/index.ts` - Add Tag, Merchant, TransactionTag interfaces
- `src/services/storage.ts` - Add v5 schema migration
  - New tables: merchants, tags, transaction_tags
  - Migrate merchant strings to Merchant entities
  - Update indices

**Deliverables**:
- ✅ Type definitions
- ✅ Database migration working
- ✅ Helper functions for merchant/tag CRUD

### Phase 2: Subcategory Support (Categories Enhanced)
**Files**:
- `src/utils/categoryHelpers.ts` - NEW: Parse/format hierarchical categories
- `src/components/settings/CategoryManagement.tsx` - NEW: Tree-based category editor
- `src/components/common/CategoryPicker.tsx` - NEW: Hierarchical dropdown
- Update `SpendingBreakdown.tsx` - Add drill-down capability
- Update AI prompts in `src/services/claude.ts`

**Deliverables**:
- ✅ Category hierarchy parsing (e.g., "Food > Restaurants")
- ✅ UI for creating subcategories
- ✅ Drill-down dashboard view
- ✅ AI suggests subcategories

### Phase 3: Tag System
**Files**:
- `src/components/settings/TagManagement.tsx` - NEW: Tag CRUD UI
- `src/components/common/TagPicker.tsx` - NEW: Multi-select tag picker
- `src/components/transactions/TransactionList.tsx` - Add tag display/filter
- `src/utils/tagCalculations.ts` - NEW: Tag aggregation helpers

**Deliverables**:
- ✅ Tag management UI
- ✅ Tag picker for transactions
- ✅ Tag filtering in transaction list
- ✅ Tag-based spending analysis

### Phase 4: Enhanced Merchant System
**Files**:
- `src/components/settings/MerchantManagement.tsx` - NEW: Merchant CRUD UI
- `src/components/common/MerchantPicker.tsx` - NEW: Merchant autocomplete
- `src/components/merchants/MerchantDetailView.tsx` - NEW: Merchant stats/transactions
- Update `src/services/csvParser.ts` - Use merchant matching logic
- Update merchant rules logic

**Deliverables**:
- ✅ Merchant management UI
- ✅ Merchant detail views
- ✅ Merchant alias matching
- ✅ Merchant merge capability

### Phase 5: Budget Enhancements
**Files**:
- Update `src/types/index.ts` - Budget type field
- Update `src/components/budgets/BudgetForm.tsx` - Support new budget types
- Update `src/utils/budgetCalculations.ts` - Calculate budgets for tags/merchants/subcategories
- Update dashboard budget displays

**Deliverables**:
- ✅ Create budgets for subcategories
- ✅ Create budgets for tags
- ✅ Create budgets for merchants
- ✅ Dashboard shows all budget types

### Phase 6: Dashboard Integration
**Files**:
- Update `SpendingBreakdown.tsx` - Subcategory drill-down
- Add `TagSpendingWidget.tsx` - NEW: Tag-based analysis
- Update `TopMerchantsTable.tsx` - Add merchant details link
- Add filtering/search capabilities

**Deliverables**:
- ✅ Category drill-down with subcategory stats
- ✅ Tag spending widget
- ✅ Enhanced merchant views
- ✅ Comprehensive filtering

## Migration & Backwards Compatibility

### User-Facing Changes
1. **Categories**: Existing categories continue to work as top-level
2. **Merchants**: Transparent migration (old merchant strings → new Merchant entities)
3. **Budgets**: Existing budgets continue to work

### Data Migration Checklist
- [ ] Backup mechanism before v5 migration
- [ ] Merchant string → Merchant entity migration
- [ ] Preserve all merchant rules
- [ ] Category validation (existing categories valid)
- [ ] Test rollback scenario

## Open Questions for User

1. **Subcategory Depth**: Limit to 2 levels (Category > Subcategory) or allow 3+ levels?
   - Recommendation: 2 levels for simplicity

2. **Tag Color Coding**: Pre-define tag colors or user-selectable?
   - Recommendation: User-selectable with smart defaults

3. **Merchant Auto-Merge**: Should AI automatically suggest merchant merges?
   - Recommendation: Yes, with user confirmation

4. **Budget Priority**: When transaction has both category budget and tag budget, which takes precedence?
   - Recommendation: Show both, separate tracking

5. **Default Tags**: Should we provide starter tags (e.g., "Recurring", "Business", "Tax-Deductible")?
   - Recommendation: Yes, with ability to customize

## Success Criteria

1. ✅ Users can create 2-level category hierarchies
2. ✅ Dashboard shows subcategory drill-down
3. ✅ Users can add multiple tags to transactions
4. ✅ Tag-based filtering and analysis works
5. ✅ Merchants are first-class entities with details/stats
6. ✅ Merchant aliases correctly match during import
7. ✅ Budgets can be created for categories, subcategories, tags, and merchants
8. ✅ All existing data migrates successfully
9. ✅ AI categorization suggests subcategories and tags
10. ✅ No performance degradation with large datasets

## Technical Risks & Mitigation

**Risk 1**: Database migration fails on large datasets
- **Mitigation**: Batch processing, progress indicators, rollback mechanism

**Risk 2**: Delimiter-based categories conflict with existing category names containing ">"
- **Mitigation**: Escape special characters, validation during migration

**Risk 3**: Performance impact of junction table queries (transaction_tags)
- **Mitigation**: Proper indices, limit tag count per transaction (max 5-10)

**Risk 4**: UI complexity increases significantly
- **Mitigation**: Progressive disclosure, hide advanced features by default

## Timeline Estimate

- Phase 1: 2-3 days (database, types, migration)
- Phase 2: 2-3 days (subcategories)
- Phase 3: 2-3 days (tags)
- Phase 4: 3-4 days (merchants)
- Phase 5: 2 days (budgets)
- Phase 6: 2-3 days (dashboard integration)

**Total**: ~14-18 days (assumes full-time work)

## Next Steps

1. ✅ Review and approve this plan
2. Answer open questions above
3. Create backup of current database
4. Begin Phase 1 implementation
