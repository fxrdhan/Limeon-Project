import React, { useCallback, useEffect } from 'react';
import { BadgeConfig } from '../types/badge';

interface UseSearchKeyboardRegistryProps {
  badgeCount: number;
  selectedBadgeIndex: number | null;
  setSelectedBadgeIndex: (
    index: number | null | ((prev: number | null) => number | null)
  ) => void;
  badgesRef: React.MutableRefObject<BadgeConfig[]>;
}

export const useSearchKeyboardRegistry = ({
  badgeCount,
  selectedBadgeIndex,
  setSelectedBadgeIndex,
  badgesRef,
}: UseSearchKeyboardRegistryProps) => {
  // Handler for Ctrl+E (left) and Ctrl+Shift+E (right) to edit badge
  const handleBadgeEdit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle Ctrl+E (with or without Shift)
      if (!e.ctrlKey || e.key.toLowerCase() !== 'e') {
        return false;
      }

      // Prevent browser's default Ctrl+E behavior (address bar focus)
      e.preventDefault();
      e.stopPropagation();

      // No badges available
      if (badgeCount === 0) return true;

      // Direction: Shift = right, no Shift = left
      const direction = e.shiftKey ? 'right' : 'left';

      // Determine which badge to edit
      let targetIndex: number;

      if (selectedBadgeIndex === null) {
        // No badge selected - start from edge based on direction
        targetIndex = direction === 'left' ? badgeCount - 1 : 0;
      } else {
        // Badge already selected - move in direction
        if (direction === 'left') {
          targetIndex = selectedBadgeIndex - 1;
          if (targetIndex < 0) targetIndex = badgeCount - 1; // Wrap to rightmost
        } else {
          targetIndex = selectedBadgeIndex + 1;
          if (targetIndex >= badgeCount) targetIndex = 0; // Wrap to leftmost
        }
      }

      // Find an editable badge starting from targetIndex going in direction
      let attempts = 0;
      while (attempts < badgeCount) {
        const badge = badgesRef.current[targetIndex];
        if (badge?.canEdit && badge?.onEdit) {
          // Found editable badge - select and edit it
          setSelectedBadgeIndex(targetIndex);
          badge.onEdit();
          return true;
        }
        // Not editable, try next badge in direction
        if (direction === 'left') {
          targetIndex--;
          if (targetIndex < 0) targetIndex = badgeCount - 1;
        } else {
          targetIndex++;
          if (targetIndex >= badgeCount) targetIndex = 0;
        }
        attempts++;
      }

      // No editable badge found
      return true;
    },
    [selectedBadgeIndex, badgeCount, setSelectedBadgeIndex, badgesRef]
  );

  // Handler for Ctrl+D to delete selected badge
  const handleBadgeDelete = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle Ctrl+D
      if (!e.ctrlKey || e.key.toLowerCase() !== 'd') {
        return false;
      }

      // Prevent browser's default Ctrl+D behavior (bookmark page)
      e.preventDefault();
      e.stopPropagation();

      // Must have a selected badge
      if (selectedBadgeIndex === null) return true;

      // Get the badge at selected index
      const badge = badgesRef.current[selectedBadgeIndex];
      if (!badge || !badge.canClear || !badge.onClear) return true;

      // Clear selection and trigger delete
      setSelectedBadgeIndex(null);
      badge.onClear();

      return true;
    },
    [selectedBadgeIndex, setSelectedBadgeIndex, badgesRef]
  );

  // Global Ctrl+D handler to override browser bookmark shortcut reliability
  // Uses capture phase to ensure we intercept it when a badge is selected
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        selectedBadgeIndex !== null &&
        e.ctrlKey &&
        e.key.toLowerCase() === 'd'
      ) {
        // Always prevent default to block browser bookmarking
        e.preventDefault();

        // Special case: If focused on a badge input, let the badge's own bubbling
        // handler handle it. This is because Badge.tsx sets isClearing=true
        // which prevents its onBlur handler from reverting the deletion.
        if (
          e.target instanceof HTMLInputElement &&
          e.target.classList.contains('badge-edit-input')
        ) {
          return;
        }

        e.stopPropagation();

        const badge = badgesRef.current[selectedBadgeIndex];
        if (badge && badge.canClear && badge.onClear) {
          setSelectedBadgeIndex(null);
          badge.onClear();
        }
      }
    };

    if (selectedBadgeIndex !== null) {
      document.addEventListener('keydown', handleGlobalKeyDown, {
        capture: true,
      });
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, {
        capture: true,
      });
    };
  }, [selectedBadgeIndex, setSelectedBadgeIndex, badgesRef]);

  // Handler for Ctrl+Arrow keyboard navigation
  const handleBadgeNavigation = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle Ctrl+Arrow Left/Right
      if (!e.ctrlKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) {
        return false;
      }

      if (badgeCount === 0) return false;

      e.preventDefault();
      e.stopPropagation();

      // Helper to check if a badge is selectable (not a separator)
      const isSelectable = (index: number): boolean => {
        const badge = badgesRef.current[index];
        // Skip separator badges - they should not be selectable
        return badge?.type !== 'separator';
      };

      // Helper to find next selectable badge in direction
      const findNextSelectable = (
        startIndex: number | null,
        direction: 'left' | 'right'
      ): number | null => {
        if (startIndex === null) {
          // Start from edge based on direction
          const edgeIndex = direction === 'left' ? badgeCount - 1 : 0;
          if (isSelectable(edgeIndex)) return edgeIndex;
          // Edge not selectable, find next
          startIndex = edgeIndex;
        }

        let currentIndex = startIndex;
        let attempts = 0;

        while (attempts < badgeCount) {
          // Move in direction
          if (direction === 'left') {
            currentIndex--;
            if (currentIndex < 0) return null; // Reached start, deselect
          } else {
            currentIndex++;
            if (currentIndex >= badgeCount) return null; // Reached end, deselect
          }

          if (isSelectable(currentIndex)) {
            return currentIndex;
          }
          attempts++;
        }

        return null; // No selectable badge found
      };

      if (e.key === 'ArrowLeft') {
        // Navigate left (to previous selectable badge)
        setSelectedBadgeIndex(prev => findNextSelectable(prev, 'left'));
      } else if (e.key === 'ArrowRight') {
        // Navigate right (to next selectable badge)
        setSelectedBadgeIndex(prev => findNextSelectable(prev, 'right'));
      }

      return true;
    },
    [badgeCount, setSelectedBadgeIndex, badgesRef]
  );

  return {
    handleBadgeEdit,
    handleBadgeDelete,
    handleBadgeNavigation,
  };
};
