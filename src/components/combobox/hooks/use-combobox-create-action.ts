import { useCallback } from 'react';

export type ComboboxCreateAction = {
  label?: string;
  onCreate: (searchTerm?: string) => void;
};

export function useComboboxCreateAction({
  createAction,
  hasExactItem,
  hasVisibleItems,
  normalizedInputValue,
}: {
  createAction?: ComboboxCreateAction;
  hasExactItem: boolean;
  hasVisibleItems: boolean;
  normalizedInputValue: string;
}) {
  const canCreate = Boolean(
    createAction &&
    !hasExactItem &&
    (normalizedInputValue.length > 0 || !hasVisibleItems)
  );
  const handleCreate = useCallback(() => {
    if (!canCreate) return;

    createAction?.onCreate(normalizedInputValue || undefined);
  }, [canCreate, createAction, normalizedInputValue]);

  return {
    canCreate,
    createActionLabel: createAction?.label ?? 'Tambah data baru',
    handleCreate,
  };
}
