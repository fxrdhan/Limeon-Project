import type { Item } from '@/types/database';
import { useCallback, useState } from 'react';

export const useItemModalState = () => {
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

  const open = useCallback((item?: Item, searchQuery?: string) => {
    setEditingItemId(item?.id);
    setEditingItemData(item);
    setCurrentSearchQuery(searchQuery);
    setIsClosing(false);
    setIsOpen(true);
    setRenderId(prevId => prevId + 1);
  }, []);

  const close = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setEditingItemId(undefined);
      setEditingItemData(undefined);
      setCurrentSearchQuery(undefined);
    }, 200);
  }, []);

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
