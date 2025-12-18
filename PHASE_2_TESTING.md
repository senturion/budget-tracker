# Phase 2 Testing Guide: Subcategory Support

## What Was Implemented

Phase 2 adds hierarchical category support with a two-level structure:
- **Parent categories**: Top-level categories (e.g., "Food")
- **Subcategories**: Nested under parents (e.g., "Food > Restaurants")

## New Features

1. **CategoryEditor** (Settings page)
   - Create parent categories
   - Add subcategories to any parent
   - Edit category names
   - Delete categories/subcategories
   - Visual tree structure with expand/collapse

2. **CategoryPicker** (Ready for use in transaction editing)
   - Dropdown with hierarchical view
   - Expandable parent categories
   - Select parent or subcategory

3. **Category Helpers** (Utility functions)
   - Parse category strings
   - Build category trees
   - Filter and sort categories

## How to Test

### 1. Open the App
The dev server should be running at: http://localhost:5173

### 2. Go to Settings
Click on "Settings" in the navigation

### 3. Test Category Management

#### A. Create a Parent Category
1. Scroll to the "Categories" section
2. Click "Add Category"
3. Enter a category name (e.g., "Food")
4. Click "Add"
5. ✅ Should see the category appear in a collapsible card

#### B. Add Subcategories
1. Find the parent category you created
2. Click the "+" icon next to the category name
3. Enter a subcategory name (e.g., "Restaurants")
4. Click "Add"
5. Click the chevron icon to expand the parent
6. ✅ Should see "› Restaurants" indented under "Food"

#### C. Create Multiple Levels
Try creating this structure:
```
Food
  › Groceries
  › Restaurants
  › Fast Food

Transportation
  › Gas
  › Public Transit

Shopping
  › Clothing
  › Electronics
```

#### D. Edit a Category
1. Click the pencil icon next to any category
2. Change the name
3. Click "Save"
4. ✅ Category name should update

#### E. Delete a Subcategory
1. Click the trash icon next to a subcategory
2. ✅ Only that subcategory should be removed

#### F. Delete a Parent Category
1. Click the trash icon next to a parent category
2. ✅ Parent AND all its subcategories should be removed

### 4. Test Category Format

Categories are stored internally with the format:
- Parent only: `"Food"`
- With subcategory: `"Food > Restaurants"`

You can verify this by:
1. Creating some categories
2. Go to Settings → Export Data
3. Open the JSON file
4. Check the `defaultCategories` array
5. ✅ Should see entries like `"Food"` and `"Food > Restaurants"`

## Expected Behavior

### ✅ Success Indicators
- Categories appear in a visual tree structure
- Subcategories are indented with "›" symbol
- Parent categories can be expanded/collapsed
- Editing works without losing data
- Deleting a parent removes all subcategories
- No console errors

### ⚠️ Known Limitations (To Be Fixed Later)
- **Transaction editing doesn't use CategoryPicker yet** - Will be done in next step
- **Dashboard doesn't show subcategory drill-down yet** - Coming in Phase 2 Part 2
- **Budget creation doesn't support subcategories yet** - Coming in Phase 5

## What to Test Next

After verifying the CategoryEditor works:
1. We'll update TransactionList to use the CategoryPicker
2. Add category drill-down to the Dashboard
3. Test that transactions can be assigned to subcategories

## Troubleshooting

### Issue: Categories card is empty
**Fix**: Make sure you have some categories. Click "Add Category" to create one.

### Issue: Can't see subcategories
**Fix**: Click the chevron (▶) icon next to the parent category to expand it.

### Issue: Categories not saving
**Check**: Open browser console (F12) for errors. The categories are stored in IndexedDB.

### Issue: UI looks broken
**Fix**: Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)

## Console Commands to Test

You can also test via browser console:

```javascript
// Get current categories
const settings = await db.table('settings').get(1);
console.log(settings.defaultCategories);

// Manually add a category (for testing)
settings.defaultCategories.push('Test > Subcategory');
await db.table('settings').put(settings);
```

## Next Steps

Once this testing is complete:
- ✅ Phase 2 Part 1: Category management (DONE)
- 🔄 Phase 2 Part 2: Update transaction UI to use CategoryPicker
- 🔄 Phase 2 Part 3: Add dashboard drill-down
- ⏳ Phase 3: Tag management UI
- ⏳ Phase 4: Merchant management UI
