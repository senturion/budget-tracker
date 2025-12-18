import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  buildCategoryTree,
  buildCategoryPath,
  parseCategory,
  type CategoryNode,
} from '../../utils/categoryHelpers';

interface CategoryPickerProps {
  categories: string[];
  value: string | null;
  onChange: (category: string | null) => void;
  placeholder?: string;
  allowNull?: boolean;
  className?: string;
}

export default function CategoryPicker({
  categories,
  value,
  onChange,
  placeholder = 'Select category...',
  allowNull = true,
  className = '',
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Build category tree
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  // Parse current value
  const currentCategory = useMemo(() => parseCategory(value), [value]);

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

  // Handle selection
  const handleSelect = (category: string | null) => {
    onChange(category);
    setIsOpen(false);
  };

  // Display value
  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    const { parent, subcategory } = parseCategory(value);
    if (subcategory) {
      return `${parent} › ${subcategory}`;
    }
    return parent || placeholder;
  }, [value, placeholder]);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {displayValue}
        </span>
        <ChevronDownIcon className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {allowNull && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-3 py-2 text-left text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                {placeholder}
              </button>
            )}

            {categoryTree.map(parent => (
              <div key={parent.name}>
                {/* Parent category */}
                <div className="flex items-center">
                  {parent.subcategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleParent(parent.name)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {expandedParents.has(parent.name) ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(parent.fullPath)}
                    className={`flex-1 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      value === parent.fullPath
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-900 dark:text-gray-100'
                    } ${parent.subcategories.length === 0 ? 'ml-10' : ''}`}
                  >
                    {parent.name}
                  </button>
                </div>

                {/* Subcategories */}
                {expandedParents.has(parent.name) &&
                  parent.subcategories.map(sub => (
                    <button
                      key={sub.fullPath}
                      type="button"
                      onClick={() => handleSelect(sub.fullPath)}
                      className={`w-full pl-12 pr-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        value === sub.fullPath
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      › {sub.name}
                    </button>
                  ))}
              </div>
            ))}

            {categoryTree.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No categories available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
