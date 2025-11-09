import { useState, useCallback, useEffect } from 'react';
import { useHistoryKeyboardNavigation } from './useHistoryKeyboardNavigation';
import type { HistoryItem } from '../organisms/HistoryTimelineList';

interface UseHistorySelectionOptions {
  /** History items to manage */
  history: HistoryItem[] | null;

  /** Whether compare mode is active (controlled by parent) */
  compareMode: boolean;

  /** Callback when a version is selected in single mode */
  onVersionSelect?: (item: HistoryItem) => void;

  /** Callback when version selection is cleared in single mode */
  onVersionDeselect?: () => void;

  /** Callback when versions are selected for comparison (2 items) */
  onCompareSelect?: (items: [HistoryItem, HistoryItem]) => void;

  /** Callback when compare selection becomes empty */
  onSelectionEmpty?: () => void;

  /** Enable keyboard navigation (default: true) */
  enableKeyboardNav?: boolean;
}

interface UseHistorySelectionReturn {
  /** Current selected version number for single view */
  selectedVersion: number | null;

  /** Handle version click in single mode */
  handleVersionClick: (item: HistoryItem) => void;

  /** Handle compare selection change */
  handleCompareSelected: (items: HistoryItem[]) => void;

  /** Handle empty selection */
  handleSelectionEmpty: () => void;

  /** Clear all selections (useful when switching modes) */
  clearSelections: () => void;
}

/**
 * Shared hook for managing history timeline selection and keyboard navigation.
 * Handles both single-select mode and compare mode selection.
 *
 * @example
 * ```tsx
 * const {
 *   selectedVersion,
 *   handleVersionClick,
 *   handleCompareSelected,
 *   clearSelections,
 * } = useHistorySelection({
 *   history,
 *   compareMode,
 *   onVersionSelect: (item) => openComparisonModal(item),
 *   onCompareSelect: ([a, b]) => openDualComparison(a, b),
 * });
 * ```
 */
export const useHistorySelection = ({
  history,
  compareMode,
  onVersionSelect,
  onVersionDeselect,
  onCompareSelect,
  onSelectionEmpty,
  enableKeyboardNav = true,
}: UseHistorySelectionOptions): UseHistorySelectionReturn => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Keyboard navigation - only enabled in single mode
  useHistoryKeyboardNavigation({
    items: history,
    enabled:
      enableKeyboardNav && !compareMode && !!history && history.length > 0,
    getCurrentIndex: () => {
      if (selectedVersion === null) return -1;
      return (
        history?.findIndex(h => h.version_number === selectedVersion) ?? -1
      );
    },
    onNavigate: item => {
      setSelectedVersion(item.version_number);
      onVersionSelect?.(item);
    },
  });

  // Clear selection when compare mode changes
  useEffect(() => {
    setSelectedVersion(null);
  }, [compareMode]);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedVersion(null);
    onSelectionEmpty?.();
  }, [onSelectionEmpty]);

  // Handle version click in single mode
  const handleVersionClick = useCallback(
    (item: HistoryItem) => {
      if (!compareMode) {
        // Single mode: toggle selection
        if (selectedVersion === item.version_number) {
          setSelectedVersion(null);
          onVersionDeselect?.();
        } else {
          setSelectedVersion(item.version_number);
          onVersionSelect?.(item);
        }
      }
    },
    [compareMode, selectedVersion, onVersionSelect, onVersionDeselect]
  );

  // Handle compare selection
  const handleCompareSelected = useCallback(
    (items: HistoryItem[]) => {
      if (items.length === 2) {
        onCompareSelect?.([items[0], items[1]]);
      } else if (items.length === 1) {
        // Single item selected in compare mode - notify empty (waiting for second selection)
        onSelectionEmpty?.();
      } else if (items.length === 0) {
        onSelectionEmpty?.();
      }
    },
    [onCompareSelect, onSelectionEmpty]
  );

  // Handle empty selection
  const handleSelectionEmpty = useCallback(() => {
    onSelectionEmpty?.();
  }, [onSelectionEmpty]);

  return {
    selectedVersion,
    handleVersionClick,
    handleCompareSelected,
    handleSelectionEmpty,
    clearSelections,
  };
};
