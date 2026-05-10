import { useCallback } from 'react';

export type ComboboxCreateAction = {
  label?: string;
  onCreate: (searchTerm?: string) => void;
};

export function useComboboxCreateAction({
  createAction,
  hasExactItem,
  normalizedInputValue,
}: {
  createAction?: ComboboxCreateAction;
  hasExactItem: boolean;
  normalizedInputValue: string;
}) {
  const canCreate = Boolean(
    createAction && normalizedInputValue.length > 0 && !hasExactItem
  );
  const handleCreate = useCallback(() => {
    if (!canCreate) return;

    createAction?.onCreate(normalizedInputValue);
  }, [canCreate, createAction, normalizedInputValue]);

  return {
    canCreate,
    createActionLabel: createAction?.label ?? 'Tambah baru',
    handleCreate,
  };
}
