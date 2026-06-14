import { describe, expect, it } from 'vite-plus/test';
import {
  getHistoryTimelineItemBgColor,
  getNextHistoryCompareSelection,
  isHistoryTimelineItemSelected,
} from './historySelection';
import type { HistoryItem } from './types';

const historyItem = (
  id: string,
  versionNumber: number,
  overrides: Partial<HistoryItem> = {}
): HistoryItem => ({
  id,
  action_type: 'UPDATE',
  changed_at: '2026-01-01T00:00:00.000Z',
  changed_fields: {},
  version_number: versionNumber,
  ...overrides,
});

describe('history timeline selection helpers', () => {
  it('adds and removes items from compare selection', () => {
    const first = historyItem('first', 1);
    const second = historyItem('second', 2);

    expect(
      getNextHistoryCompareSelection({
        item: second,
        maxSelections: 2,
        selectedItems: [first],
      })
    ).toEqual([first, second]);

    expect(
      getNextHistoryCompareSelection({
        item: first,
        maxSelections: 2,
        selectedItems: [first, second],
      })
    ).toEqual([second]);
  });

  it('replaces the oldest compare selection when the limit is reached', () => {
    const first = historyItem('first', 1);
    const second = historyItem('second', 2);
    const third = historyItem('third', 3);

    expect(
      getNextHistoryCompareSelection({
        item: third,
        maxSelections: 2,
        selectedItems: [first, second],
      })
    ).toEqual([second, third]);
  });

  it('detects selected items in compare and single-select modes', () => {
    const first = historyItem('first', 1);
    const second = historyItem('second', 2);

    expect(
      isHistoryTimelineItemSelected({
        allowMultiSelect: true,
        item: second,
        selectedForCompare: [second],
        selectedVersion: null,
        selectedVersions: [],
      })
    ).toBe(true);

    expect(
      isHistoryTimelineItemSelected({
        allowMultiSelect: false,
        item: first,
        selectedForCompare: [],
        selectedVersion: null,
        selectedVersions: [1],
      })
    ).toBe(true);

    expect(
      isHistoryTimelineItemSelected({
        allowMultiSelect: false,
        item: second,
        selectedForCompare: [],
        selectedVersion: 2,
        selectedVersions: [],
      })
    ).toBe(true);
  });

  it('uses hover background only for unselected items', () => {
    const first = historyItem('first', 1);

    expect(
      getHistoryTimelineItemBgColor({
        allowMultiSelect: false,
        item: first,
        selectedForCompare: [],
        selectedVersion: 1,
        selectedVersions: [],
      })
    ).toBe('');

    expect(
      getHistoryTimelineItemBgColor({
        allowMultiSelect: false,
        item: first,
        selectedForCompare: [],
        selectedVersion: null,
        selectedVersions: [],
      })
    ).toBe('hover:bg-slate-50');
  });
});
