import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { HoverDetailData } from '@/types/components';
import type { ComboboxVirtualScrollToIndex } from './use-combobox-option-keyboard-scroll';

export type ComboboxOptionInteractionCore = {
  actualOpen: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  popupContentRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsSearchNavigationFocus: Dispatch<SetStateAction<boolean>>;
  virtualScrollToIndexRef: RefObject<ComboboxVirtualScrollToIndex | null>;
};

export type ComboboxOptionInteractionSelection<Item> = {
  canCreate: boolean;
  handleCreate: () => void;
  isItemDisabled: (item: Item) => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  normalizedInputValue: string;
  searchable: boolean;
  selectedValue: Item | null;
  visibleItems: readonly Item[];
};

export type ComboboxOptionInteractionHoverDetail<Item> = {
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  itemToHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  onFetchHoverDetailError?: (error: unknown, id: string) => void;
};

export type ComboboxOptionInteractionServices = {
  requestSelectedOptionScroll: () => void;
};

export type UseComboboxOptionInteractionOptions<Item> = {
  core: ComboboxOptionInteractionCore;
  hoverDetail: ComboboxOptionInteractionHoverDetail<Item>;
  selection: ComboboxOptionInteractionSelection<Item>;
  services: ComboboxOptionInteractionServices;
};
