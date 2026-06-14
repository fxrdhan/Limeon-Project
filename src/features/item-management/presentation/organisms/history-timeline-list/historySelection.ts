import type { HistoryItem } from './types';

export const getNextHistoryCompareSelection = ({
  item,
  maxSelections,
  selectedItems,
}: {
  item: HistoryItem;
  maxSelections: number;
  selectedItems: HistoryItem[];
}) => {
  if (selectedItems.some(selected => selected.id === item.id)) {
    return selectedItems.filter(selected => selected.id !== item.id);
  }

  if (selectedItems.length < maxSelections) {
    return [...selectedItems, item];
  }

  return [...selectedItems.slice(1), item];
};

export const isHistoryTimelineItemSelected = ({
  allowMultiSelect,
  item,
  selectedForCompare,
  selectedVersion,
  selectedVersions,
}: {
  allowMultiSelect: boolean;
  item: HistoryItem;
  selectedForCompare: HistoryItem[];
  selectedVersion: number | null;
  selectedVersions: number[];
}) => {
  if (allowMultiSelect) {
    return selectedForCompare.some(selected => selected.id === item.id);
  }

  return (
    selectedVersions.includes(item.version_number) ||
    selectedVersion === item.version_number
  );
};

export const getHistoryTimelineItemBgColor = (
  options: Parameters<typeof isHistoryTimelineItemSelected>[0]
) => (isHistoryTimelineItemSelected(options) ? '' : 'hover:bg-slate-50');
