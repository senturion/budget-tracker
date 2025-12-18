import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import {
  buildCategoryTree,
  buildCategoryPath,
  parseCategory,
  isValidCategoryPath,
  type CategoryNode,
} from '../../utils/categoryHelpers';

interface CategoryEditorProps {
  categories: string[];
  onChange: (categories: string[]) => void;
}

export default function CategoryEditor({ categories, onChange }: CategoryEditorProps) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Build category tree
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  // Toggle parent expansion
  const toggleParent = (parentName: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentName)) {
        next.delete(parentName);
      } else {
        next.add(parentName);
      }
      return next;
    });
  };

  // Add a new parent category
  const handleAddParent = () => {
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    if (categories.includes(newCategoryName.trim())) {
      setError('Category already exists');
      return;
    }

    onChange([...categories, newCategoryName.trim()]);
    setNewCategoryName('');
    setAddingTo(null);
    setError(null);
  };

  // Add a subcategory
  const handleAddSubcategory = (parentName: string) => {
    if (!newCategoryName.trim()) {
      setError('Subcategory name cannot be empty');
      return;
    }

    const fullPath = buildCategoryPath(parentName, newCategoryName.trim());

    if (categories.includes(fullPath)) {
      setError('Subcategory already exists');
      return;
    }

    onChange([...categories, fullPath]);
    setNewCategoryName('');
    setAddingTo(null);
    setError(null);

    // Expand parent to show new subcategory
    setExpandedParents(prev => new Set(prev).add(parentName));
  };

  // Delete a category
  const handleDelete = (categoryPath: string) => {
    const { parent, subcategory } = parseCategory(categoryPath);

    if (!subcategory) {
      // Deleting a parent - also delete all subcategories
      const filtered = categories.filter(cat => {
        const parsed = parseCategory(cat);
        return parsed.parent !== parent;
      });
      onChange(filtered);
    } else {
      // Deleting a subcategory only
      onChange(categories.filter(cat => cat !== categoryPath));
    }
  };

  // Start editing
  const startEdit = (categoryPath: string) => {
    const { parent, subcategory } = parseCategory(categoryPath);
    setEditingCategory(categoryPath);
    setEditValue(subcategory || parent || '');
    setError(null);
  };

  // Save edit
  const saveEdit = (oldPath: string) => {
    if (!editValue.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    const { parent, subcategory } = parseCategory(oldPath);
    let newPath: string;

    if (subcategory) {
      // Editing a subcategory
      newPath = buildCategoryPath(parent!, editValue.trim());
    } else {
      // Editing a parent - need to update all subcategories too
      newPath = editValue.trim();
    }

    if (newPath !== oldPath && categories.includes(newPath)) {
      setError('Category already exists');
      return;
    }

    const updated = categories.map(cat => {
      if (cat === oldPath) {
        return newPath;
      }
      // If editing a parent, update all its subcategories
      if (!subcategory) {
        const parsed = parseCategory(cat);
        if (parsed.parent === parent && parsed.subcategory) {
          return buildCategoryPath(newPath, parsed.subcategory);
        }
      }
      return cat;
    });

    onChange(updated);
    setEditingCategory(null);
    setEditValue('');
    setError(null);
  };

  // Cancel edit/add
  const cancel = () => {
    setEditingCategory(null);
    setAddingTo(null);
    setNewCategoryName('');
    setEditValue('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Category Hierarchy
        </h3>
        <button
          type="button"
          onClick={() => setAddingTo('root')}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Add root category form */}
      {addingTo === 'root' && (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddParent}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={cancel}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Category tree */}
      <div className="space-y-1">
        {categoryTree.map(parent => (
          <div key={parent.name} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            {/* Parent category */}
            <div className="flex items-center bg-white dark:bg-gray-800">
              {parent.subcategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleParent(parent.name)}
                  className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {expandedParents.has(parent.name) ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
              )}

              {editingCategory === parent.fullPath ? (
                <div className="flex-1 flex items-center space-x-2 p-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(parent.fullPath)}
                    className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancel}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className={`flex-1 p-3 font-medium text-gray-900 dark:text-gray-100 ${parent.subcategories.length === 0 ? 'ml-11' : ''}`}>
                    {parent.name}
                  </div>
                  <div className="flex items-center space-x-1 p-2">
                    <button
                      type="button"
                      onClick={() => setAddingTo(parent.name)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Add subcategory"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(parent.fullPath)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(parent.fullPath)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Add subcategory form */}
            {addingTo === parent.name && (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="w-8" /> {/* Spacer for alignment */}
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Subcategory name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleAddSubcategory(parent.name)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Subcategories */}
            {expandedParents.has(parent.name) && parent.subcategories.map(sub => (
              <div
                key={sub.fullPath}
                className="flex items-center bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="w-11" /> {/* Spacer for indent */}

                {editingCategory === sub.fullPath ? (
                  <div className="flex-1 flex items-center space-x-2 p-2">
                    <span className="text-gray-500 dark:text-gray-400">›</span>
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(sub.fullPath)}
                      className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancel}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 p-3 text-gray-900 dark:text-gray-100">
                      › {sub.name}
                    </div>
                    <div className="flex items-center space-x-1 p-2">
                      <button
                        type="button"
                        onClick={() => startEdit(sub.fullPath)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sub.fullPath)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}

        {categoryTree.length === 0 && !addingTo && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No categories yet. Click "Add Category" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
