/**
 * useItemsDisplayTransform.ts
 *
 * Fixes type issues and unused variables from the previous implementation.
 *
 * - Avoids `any` usage by using `unknown` and `Record<string, unknown>`
 * - Removes unused parameter names (using `[, mode]` where appropriate)
 * - Keeps stable object identity when no transform is required
 */

import { useMemo } from 'react';

export type ColumnDisplayMode = 'name' | 'code';
export type DisplayModes = Record<string, ColumnDisplayMode>;

// Supported reference keys in items data
type RefEntityKey = 'manufacturer' | 'category' | 'type' | 'package' | 'dosage';
type RefEntityFields = Partial<Record<RefEntityKey, unknown>>;
type RefEntityRecord = Record<string, unknown>;

/**
 * Map AG-Grid reference column ids to item entity keys
 * Example: "manufacturer.name" -> "manufacturer"
 */
const REF_COLID_TO_ENTITY_KEY: Record<string, RefEntityKey> = {
  'manufacturer.name': 'manufacturer',
  'category.name': 'category',
  'type.name': 'type',
  'package.name': 'package',
  'dosage.name': 'dosage',
};

/**
 * Extract entity key from column id ("foo.name" -> "foo").
 * Falls back to undefined if not recognized.
 */
function toEntityKey(colId: string): RefEntityKey | undefined {
  if (colId in REF_COLID_TO_ENTITY_KEY) {
    return REF_COLID_TO_ENTITY_KEY[colId];
  }
  // Fallback by splitting
  const first = colId.split('.')[0];
  if (
    first === 'manufacturer' ||
    first === 'category' ||
    first === 'type' ||
    first === 'package' ||
    first === 'dosage'
  ) {
    return first as RefEntityKey;
  }
  return undefined;
}

const isObjectRecord = (value: unknown): value is RefEntityRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readReferenceCode = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const readReferenceName = (value: unknown) =>
  typeof value === 'string' || value === null ? value : undefined;

/**
 * Transform a single item for display based on the reference display modes.
 * - When a ref column display mode is "code", replace entity.name with entity.code (if present).
 * - Other fields remain untouched.
 * - Returns the same object reference if no changes were applied for performance.
 */
export function transformItemForDisplay<T extends object & RefEntityFields>(
  item: T,
  displayModes: DisplayModes
): T {
  if (!item || typeof item !== 'object') return item;

  // Determine which entity keys need transformation to "code"
  const entityKeysToMap = Object.entries(displayModes)
    .filter(([, mode]) => mode === 'code')
    .map(([colId]) => toEntityKey(colId))
    .filter((k): k is RefEntityKey => Boolean(k));

  if (entityKeysToMap.length === 0) {
    // Nothing to transform
    return item;
  }

  let transformedItem: T | null = null;

  for (const entityKey of entityKeysToMap) {
    const entity = item[entityKey];
    if (!isObjectRecord(entity)) {
      continue;
    }

    const codeValue = readReferenceCode(entity.code);
    const nameValue = readReferenceName(entity.name);
    if (codeValue === null || codeValue === nameValue) {
      continue;
    }

    transformedItem ??= { ...item };
    Object.defineProperty(transformedItem, entityKey, {
      configurable: true,
      enumerable: true,
      value: {
        ...entity,
        name: codeValue,
      },
      writable: true,
    });
  }

  return transformedItem ?? item;
}

/**
 * Transform an array of items for display based on the reference display modes.
 * - Non-mutating: returns new array with shallow-cloned items only when needed
 * - Preserves object identity when no change is required for a given item
 */
export function transformItemsForDisplay<T extends object & RefEntityFields>(
  items: T[] | undefined,
  displayModes: DisplayModes
): T[] {
  if (!Array.isArray(items) || items.length === 0) return items ?? [];

  let anyChanged = false;

  const transformed = items.map(it => {
    const t = transformItemForDisplay(it, displayModes);
    if (t !== it) anyChanged = true;
    return t;
  });

  return anyChanged ? transformed : items;
}

/**
 * useItemsDisplayTransform
 *
 * Extracts and centralizes the display transformation of item reference columns
 * based on the user's selected display modes (name/code) for:
 * - manufacturer.name
 * - category.name
 * - type.name
 * - package.name
 * - dosage.name
 *
 * This hook is intended to be used upstream of the grid, so the grid can simply
 * render `*.name` fields while the actual rendering can be toggled between
 * name or code without touching grid definitions.
 *
 * Example:
 * const itemsForGrid = useItemsDisplayTransform(items, columnDisplayModes);
 */
export function useItemsDisplayTransform<T extends object & RefEntityFields>(
  items: T[] | undefined,
  displayModes: DisplayModes
): T[] {
  // We intentionally include the displayModes object directly in the deps array.
  // Consumers should provide a stable reference if they want to avoid recalculation.
  return useMemo(
    () => transformItemsForDisplay(items, displayModes),
    [items, displayModes]
  );
}
