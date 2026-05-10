import { describe, expect, it } from 'vite-plus/test';
import {
  getComboboxDefaultHighlightIndex,
  getComboboxEffectiveHighlightIndex,
  isComboboxListNavigationKey,
  isComboboxPrintableSearchKey,
} from './utils/preset-highlight';

type Item = {
  disabled?: boolean;
  id: string;
};

const items: Item[] = [
  { disabled: true, id: 'disabled' },
  { id: 'selected' },
  { id: 'available' },
];
const isItemDisabled = (item: Item) => Boolean(item.disabled);
const isSameItem = (item: Item, value: Item) => item.id === value.id;

describe('Combobox preset highlight helpers', () => {
  it('prefers the selected enabled option for default highlight', () => {
    expect(
      getComboboxDefaultHighlightIndex({
        isItemDisabled,
        isSameItem,
        items,
        selectedValue: { id: 'selected' },
      })
    ).toBe(1);
  });

  it('falls back to the first enabled option when the selection cannot be highlighted', () => {
    expect(
      getComboboxDefaultHighlightIndex({
        isItemDisabled,
        isSameItem,
        items,
        selectedValue: { id: 'missing' },
      })
    ).toBe(1);
  });

  it('uses an explicit highlighted option only while it is valid and open', () => {
    expect(
      getComboboxEffectiveHighlightIndex({
        actualOpen: true,
        highlightedIndex: 2,
        isItemDisabled,
        isSameItem,
        items,
        selectedValue: { id: 'selected' },
      })
    ).toBe(2);
    expect(
      getComboboxEffectiveHighlightIndex({
        actualOpen: true,
        highlightedIndex: 0,
        isItemDisabled,
        isSameItem,
        items,
        selectedValue: { id: 'selected' },
      })
    ).toBe(1);
    expect(
      getComboboxEffectiveHighlightIndex({
        actualOpen: false,
        highlightedIndex: 2,
        isItemDisabled,
        isSameItem,
        items,
        selectedValue: { id: 'selected' },
      })
    ).toBeNull();
  });

  it('classifies preset keyboard routing keys', () => {
    expect(isComboboxListNavigationKey('ArrowDown')).toBe(true);
    expect(isComboboxListNavigationKey('PageUp')).toBe(true);
    expect(isComboboxListNavigationKey('Enter')).toBe(false);

    expect(
      isComboboxPrintableSearchKey({
        altKey: false,
        ctrlKey: false,
        key: 'a',
        metaKey: false,
      })
    ).toBe(true);
    expect(
      isComboboxPrintableSearchKey({
        altKey: false,
        ctrlKey: true,
        key: 'a',
        metaKey: false,
      })
    ).toBe(false);
    expect(
      isComboboxPrintableSearchKey({
        altKey: false,
        ctrlKey: false,
        key: ' ',
        metaKey: false,
      })
    ).toBe(false);
    expect(
      isComboboxPrintableSearchKey({
        altKey: false,
        ctrlKey: false,
        key: 'Enter',
        metaKey: false,
      })
    ).toBe(false);
  });
});
