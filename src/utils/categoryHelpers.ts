/**
 * Category Helpers - Utilities for hierarchical category management
 *
 * Supports two-level category hierarchy using delimiter format:
 * - "Food" (top-level category)
 * - "Food > Restaurants" (category with subcategory)
 */

export const CATEGORY_DELIMITER = ' > ';

/**
 * Category tree node structure
 */
export interface CategoryNode {
  name: string;
  fullPath: string;
  subcategories: CategoryNode[];
  transactionCount?: number;
  totalAmount?: number;
}

/**
 * Parse a category string into parts
 * @example "Food > Restaurants" => { parent: "Food", subcategory: "Restaurants", fullPath: "Food > Restaurants" }
 */
export function parseCategory(category: string | null): {
  parent: string | null;
  subcategory: string | null;
  fullPath: string | null;
} {
  if (!category) {
    return { parent: null, subcategory: null, fullPath: null };
  }

  const parts = category.split(CATEGORY_DELIMITER).map(p => p.trim());

  if (parts.length === 1) {
    return {
      parent: parts[0],
      subcategory: null,
      fullPath: parts[0],
    };
  }

  return {
    parent: parts[0],
    subcategory: parts[1],
    fullPath: category,
  };
}

/**
 * Build a category string from parts
 */
export function buildCategoryPath(parent: string, subcategory?: string): string {
  if (!subcategory) {
    return parent;
  }
  return `${parent}${CATEGORY_DELIMITER}${subcategory}`;
}

/**
 * Get parent category from a full path
 * @example "Food > Restaurants" => "Food"
 */
export function getParentCategory(category: string | null): string | null {
  if (!category) return null;
  const { parent } = parseCategory(category);
  return parent;
}

/**
 * Get subcategory from a full path
 * @example "Food > Restaurants" => "Restaurants"
 */
export function getSubcategory(category: string | null): string | null {
  if (!category) return null;
  const { subcategory } = parseCategory(category);
  return subcategory;
}

/**
 * Check if a category has a subcategory
 */
export function hasSubcategory(category: string | null): boolean {
  if (!category) return false;
  return category.includes(CATEGORY_DELIMITER);
}

/**
 * Build a category tree from a flat list of categories
 */
export function buildCategoryTree(categories: string[]): CategoryNode[] {
  const tree: Map<string, CategoryNode> = new Map();

  // Process each category
  categories.forEach(category => {
    const { parent, subcategory } = parseCategory(category);

    if (!parent) return;

    // Ensure parent node exists
    if (!tree.has(parent)) {
      tree.set(parent, {
        name: parent,
        fullPath: parent,
        subcategories: [],
      });
    }

    // Add subcategory if present
    if (subcategory) {
      const parentNode = tree.get(parent)!;
      const subcategoryNode: CategoryNode = {
        name: subcategory,
        fullPath: buildCategoryPath(parent, subcategory),
        subcategories: [],
      };

      // Only add if not already present
      if (!parentNode.subcategories.find(s => s.name === subcategory)) {
        parentNode.subcategories.push(subcategoryNode);
      }
    }
  });

  // Convert to sorted array
  return Array.from(tree.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all parent categories (unique)
 */
export function getParentCategories(categories: string[]): string[] {
  const parents = new Set<string>();

  categories.forEach(category => {
    const { parent } = parseCategory(category);
    if (parent) {
      parents.add(parent);
    }
  });

  return Array.from(parents).sort();
}

/**
 * Get subcategories for a specific parent
 */
export function getSubcategoriesForParent(categories: string[], parent: string): string[] {
  const subcategories = new Set<string>();

  categories.forEach(category => {
    const parsed = parseCategory(category);
    if (parsed.parent === parent && parsed.subcategory) {
      subcategories.add(parsed.subcategory);
    }
  });

  return Array.from(subcategories).sort();
}

/**
 * Validate a category path
 */
export function isValidCategoryPath(category: string): boolean {
  if (!category || category.trim() === '') {
    return false;
  }

  const parts = category.split(CATEGORY_DELIMITER).map(p => p.trim());

  // Must have 1 or 2 parts (parent or parent + subcategory)
  if (parts.length > 2) {
    return false;
  }

  // All parts must be non-empty
  return parts.every(part => part.length > 0);
}

/**
 * Filter categories by parent
 */
export function filterByParent(categories: string[], parent: string): string[] {
  return categories.filter(category => {
    const parsed = parseCategory(category);
    return parsed.parent === parent;
  });
}

/**
 * Check if a transaction matches a category filter
 * Supports filtering by parent (includes all subcategories) or exact match
 */
export function matchesCategory(
  transactionCategory: string | null,
  filterCategory: string,
  includeSubcategories: boolean = true
): boolean {
  if (!transactionCategory) return false;

  const txCat = parseCategory(transactionCategory);
  const filterCat = parseCategory(filterCategory);

  // Exact match
  if (txCat.fullPath === filterCat.fullPath) {
    return true;
  }

  // Parent match (if including subcategories)
  if (includeSubcategories && !filterCat.subcategory) {
    return txCat.parent === filterCat.parent;
  }

  return false;
}

/**
 * Sort categories hierarchically
 * Parents first, then their subcategories
 */
export function sortCategoriesHierarchically(categories: string[]): string[] {
  const tree = buildCategoryTree(categories);
  const sorted: string[] = [];

  tree.forEach(parent => {
    sorted.push(parent.fullPath);
    parent.subcategories.forEach(sub => {
      sorted.push(sub.fullPath);
    });
  });

  return sorted;
}
