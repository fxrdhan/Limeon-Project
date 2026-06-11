import { getComboboxSearchEntries as getComboboxSearchEntriesImpl } from './preset-search/entries';
import {
  defaultComboboxLargeListVisibleItemLimit as defaultComboboxLargeListVisibleItemLimitImpl,
  getEffectiveComboboxVisibleItemLimit as getEffectiveComboboxVisibleItemLimitImpl,
} from './preset-search/limits';
import { getComboboxSearchState as getComboboxSearchStateImpl } from './preset-search/state';

export type {
  ComboboxSearchEntry,
  ComboboxSearchState,
  ItemLabelGetter,
} from './preset-search/types';

export const defaultComboboxLargeListVisibleItemLimit =
  defaultComboboxLargeListVisibleItemLimitImpl;

export const getComboboxSearchEntries = getComboboxSearchEntriesImpl;

export const getEffectiveComboboxVisibleItemLimit =
  getEffectiveComboboxVisibleItemLimitImpl;

export const getComboboxSearchState = <Item>(
  options: Omit<
    Parameters<typeof getComboboxSearchStateImpl<Item>>[0],
    'getEffectiveVisibleItemLimit'
  >
) =>
  getComboboxSearchStateImpl({
    ...options,
    getEffectiveVisibleItemLimit: getEffectiveComboboxVisibleItemLimit,
  });
