import { useEffect } from 'react';

/**
 * Generic hook for keyboard navigation in a list of items.
 * Handles ArrowUp/ArrowDown keys to navigate through items.
 *
 * @template T - The type of items in the list
 */
interface UseHistoryKeyboardNavigationProps<T> {
  /** Array of items to navigate through */
  items: T[] | null;

  /** Whether keyboard navigation is enabled */
  enabled: boolean;

  /** Function to get the current selected index (-1 if none selected) */
  getCurrentIndex: () => number;

  /** Callback when user navigates to a new item */
  onNavigate: (item: T, index: number) => void;

  /** Optional: custom logic to determine if event should be ignored */
  shouldIgnoreEvent?: (e: KeyboardEvent) => boolean;
}

/**
 * Custom hook for handling keyboard navigation in history lists.
 *
 * Features:
 * - ArrowDown: Navigate to next item (wraps to first item if at end)
 * - ArrowUp: Navigate to previous item (wraps to last item if at start)
 * - Circular/infinite navigation: seamlessly loops through the list
 * - Auto-start at first item if none selected
 * - Ignores keyboard events when typing in inputs/textareas
 *
 * @example
 * ```tsx
 * useHistoryKeyboardNavigation({
 *   items: historyList,
 *   enabled: !compareMode,
 *   getCurrentIndex: () => selectedIndex,
 *   onNavigate: (item, index) => {
 *     setSelectedIndex(index);
 *     onItemSelect(item);
 *   },
 * });
 * ```
 */
export const useHistoryKeyboardNavigation = <T>({
  items,
  enabled,
  getCurrentIndex,
  onNavigate,
  shouldIgnoreEvent,
}: UseHistoryKeyboardNavigationProps<T>) => {
  useEffect(() => {
    // Guard: Don't attach listener if disabled or no items
    if (!enabled || !items || items.length === 0) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Default behavior: ignore keyboard events when typing in form fields
      const shouldIgnore =
        shouldIgnoreEvent?.(e) ??
        (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement);

      if (shouldIgnore) {
        return;
      }

      // Handle ArrowUp and ArrowDown
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();

        const currentIndex = getCurrentIndex();
        let targetIndex: number;

        if (currentIndex === -1) {
          // No selection: start at first item
          targetIndex = 0;
        } else if (e.key === 'ArrowDown') {
          // Navigate down - circular: wrap to first item if at end
          targetIndex = (currentIndex + 1) % items.length;
        } else {
          // Navigate up - circular: wrap to last item if at start
          targetIndex = (currentIndex - 1 + items.length) % items.length;
        }

        // Always trigger navigation (circular means index can wrap around)
        onNavigate(items[targetIndex], targetIndex);
      }
    };

    // Attach global keyboard listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount or dependency change
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, items, getCurrentIndex, onNavigate, shouldIgnoreEvent]);
};
