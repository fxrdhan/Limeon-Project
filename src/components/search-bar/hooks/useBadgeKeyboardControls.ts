import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import type { BadgeConfig } from '../types/badge';

interface UseBadgeKeyboardControlsParams {
  value: string;
  editingBadge: unknown;
  editingGroupBadge: unknown;
  inputRef: RefObject<HTMLInputElement | null> | undefined;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
}

export const useBadgeKeyboardControls = ({
  value,
  editingBadge,
  editingGroupBadge,
  inputRef,
  scrollAreaRef,
}: UseBadgeKeyboardControlsParams) => {
  const [selectedBadgeIndex, setSelectedBadgeIndex] = useState<number | null>(
    null
  );
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const badgesRef = useRef<BadgeConfig[]>([]);

  const handleBadgeCountChange = useCallback(
    (count: number) => {
      setBadgeCount(count);
      if (selectedBadgeIndex !== null && selectedBadgeIndex >= count) {
        setSelectedBadgeIndex(count > 0 ? count - 1 : null);
      }
    },
    [selectedBadgeIndex]
  );

  const handleBadgesChange = useCallback((badges: BadgeConfig[]) => {
    badgesRef.current = badges;
  }, []);

  const handleBadgeSelect = useCallback((index: number) => {
    setSelectedBadgeIndex(index);
  }, []);

  const scrollBadgesToEnd = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [scrollAreaRef]);

  useEffect(() => {
    if (selectedBadgeIndex !== null) return;
    if (editingBadge || editingGroupBadge) return;
    const inputEl = inputRef?.current;
    if (!inputEl) return;
    if (document.activeElement !== inputEl) return;
    requestAnimationFrame(scrollBadgesToEnd);
  }, [
    value,
    selectedBadgeIndex,
    editingBadge,
    editingGroupBadge,
    inputRef,
    scrollBadgesToEnd,
  ]);

  const handleBadgeEdit = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== 'e') {
        return false;
      }

      e.preventDefault();
      e.stopPropagation();

      if (badgeCount === 0) return true;

      const direction = e.shiftKey ? 'right' : 'left';
      let targetIndex: number;

      if (selectedBadgeIndex === null) {
        targetIndex = direction === 'left' ? badgeCount - 1 : 0;
      } else if (direction === 'left') {
        targetIndex = selectedBadgeIndex - 1;
        if (targetIndex < 0) targetIndex = badgeCount - 1;
      } else {
        targetIndex = selectedBadgeIndex + 1;
        if (targetIndex >= badgeCount) targetIndex = 0;
      }

      let attempts = 0;
      while (attempts < badgeCount) {
        const badge = badgesRef.current[targetIndex];
        if (badge?.canEdit && badge?.onEdit) {
          setSelectedBadgeIndex(targetIndex);
          badge.onEdit();
          return true;
        }

        if (direction === 'left') {
          targetIndex--;
          if (targetIndex < 0) targetIndex = badgeCount - 1;
        } else {
          targetIndex++;
          if (targetIndex >= badgeCount) targetIndex = 0;
        }
        attempts++;
      }

      return true;
    },
    [selectedBadgeIndex, badgeCount]
  );

  const handleBadgeDelete = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== 'd') {
        return false;
      }

      e.preventDefault();
      e.stopPropagation();

      if (selectedBadgeIndex === null) return true;

      const badge = badgesRef.current[selectedBadgeIndex];
      if (!badge || !badge.canClear || !badge.onClear) return true;

      setSelectedBadgeIndex(null);
      badge.onClear();

      return true;
    },
    [selectedBadgeIndex]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        selectedBadgeIndex !== null &&
        e.ctrlKey &&
        e.key.toLowerCase() === 'd'
      ) {
        e.preventDefault();

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
  }, [selectedBadgeIndex]);

  useEffect(() => {
    if (selectedBadgeIndex === null) return;

    const handleGlobalSelectedBadgeDelete = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const target = e.target;
      if (target instanceof HTMLInputElement) {
        if (target.classList.contains('badge-edit-input')) return;
        if (target.value.length > 0) return;
      } else if (target instanceof HTMLTextAreaElement) {
        if (target.value.length > 0) return;
      } else if (target instanceof HTMLElement && target.isContentEditable) {
        return;
      }

      const badge = badgesRef.current[selectedBadgeIndex];
      if (!badge || !badge.canClear || !badge.onClear) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      setSelectedBadgeIndex(null);
      badge.onClear();
    };

    window.addEventListener('keydown', handleGlobalSelectedBadgeDelete, {
      capture: true,
    });

    return () => {
      window.removeEventListener('keydown', handleGlobalSelectedBadgeDelete, {
        capture: true,
      });
    };
  }, [selectedBadgeIndex]);

  const handleBadgeNavigation = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!e.ctrlKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) {
        return false;
      }

      if (badgeCount === 0) return false;

      e.preventDefault();
      e.stopPropagation();

      const isSelectable = (index: number): boolean => {
        const badge = badgesRef.current[index];
        return (
          badge?.type !== 'separator' &&
          badge?.type !== 'groupOpen' &&
          badge?.type !== 'groupClose'
        );
      };

      const findNextSelectable = (
        startIndex: number | null,
        direction: 'left' | 'right'
      ): number | null => {
        if (startIndex === null) {
          const edgeIndex = direction === 'left' ? badgeCount - 1 : 0;
          if (isSelectable(edgeIndex)) return edgeIndex;
          startIndex = edgeIndex;
        }

        let currentIndex = startIndex;
        for (let attempts = 0; attempts < badgeCount; attempts++) {
          const nextIndex =
            direction === 'left' ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex < 0 || nextIndex >= badgeCount) {
            break;
          }

          currentIndex = nextIndex;
          if (isSelectable(currentIndex)) {
            return currentIndex;
          }
        }

        return null;
      };

      if (e.key === 'ArrowLeft') {
        setSelectedBadgeIndex(prev => findNextSelectable(prev, 'left'));
      } else {
        setSelectedBadgeIndex(prev => findNextSelectable(prev, 'right'));
      }

      return true;
    },
    [badgeCount]
  );

  const clearBadgeSelection = useCallback(() => {
    if (selectedBadgeIndex !== null) {
      setSelectedBadgeIndex(null);
    }
  }, [selectedBadgeIndex]);

  const resetBadgeKeyboardState = useCallback(() => {
    setSelectedBadgeIndex(null);
    setBadgeCount(0);
    badgesRef.current = [];
  }, []);

  return {
    selectedBadgeIndex,
    setSelectedBadgeIndex,
    badgeCount,
    badgesRef,
    handleBadgeCountChange,
    handleBadgesChange,
    handleBadgeSelect,
    handleBadgeEdit,
    handleBadgeDelete,
    handleBadgeNavigation,
    clearBadgeSelection,
    resetBadgeKeyboardState,
  };
};
