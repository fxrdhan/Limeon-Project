import type { HoverDetailData } from '@/types/components';

type ComboboxItemRecord = Partial<HoverDetailData> & {
  disabled?: boolean;
};

const getComboboxItemRecord = <Item>(item: Item): ComboboxItemRecord =>
  typeof item === 'object' && item !== null ? (item as ComboboxItemRecord) : {};

export const getDefaultItemDisabled = <Item>(item: Item) =>
  Boolean(getComboboxItemRecord(item).disabled);

export const getDefaultHoverDetailData = <Item>(
  item: Item
): Partial<HoverDetailData> => {
  const itemRecord = getComboboxItemRecord(item);

  return {
    display: itemRecord.display,
    data: itemRecord.data,
    code: itemRecord.code,
    description: itemRecord.description,
    metaLabel: itemRecord.metaLabel,
    metaTone: itemRecord.metaTone,
    created_at: itemRecord.created_at,
    createdAt: itemRecord.createdAt,
    updated_at: itemRecord.updated_at,
    updatedAt: itemRecord.updatedAt,
  };
};
