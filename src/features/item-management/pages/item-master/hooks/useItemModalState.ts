import type { Item } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useItemModalState = () => {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | undefined>(
    undefined
  );
  const [editingItemData, setEditingItemData] = useState<Item | undefined>(
    undefined
  );
  const [currentSearchQuery, setCurrentSearchQuery] = useState<
    string | undefined
  >(undefined);
  const [renderId, setRenderId] = useState(0);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) {
      return;
    }

    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const open = useCallback(
    (item?: Item, searchQuery?: string) => {
      clearCloseTimer();
      setEditingItemId(item?.id);
      setEditingItemData(item);
      setCurrentSearchQuery(searchQuery);
      setIsClosing(false);
      setIsOpen(true);
      setRenderId(prevId => prevId + 1);
    },
    [clearCloseTimer]
  );

  const close = useCallback(() => {
    clearCloseTimer();
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setEditingItemId(undefined);
      setEditingItemData(undefined);
      setCurrentSearchQuery(undefined);
      closeTimerRef.current = null;
    }, 200);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return {
    isOpen,
    isClosing,
    setIsClosing,
    editingItemId,
    editingItemData,
    currentSearchQuery,
    renderId,
    open,
    close,
  };
};
