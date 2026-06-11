export interface HistoryItem {
  id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_fields?: Record<string, unknown>;
}

export interface HistoryTimelineListProps {
  history: HistoryItem[] | null;
  isLoading: boolean;
  onVersionClick: (item: HistoryItem) => void;
  selectedVersions?: number[];
  selectedVersion?: number | null;
  showRestoreButton?: boolean;
  onRestore?: (version: number) => void;
  emptyMessage?: string;
  loadingMessage?: string;
  allowMultiSelect?: boolean;
  onCompareSelected?: (versions: HistoryItem[]) => void;
  maxSelections?: number;
  onSelectionEmpty?: () => void;
  isFlipped?: boolean;
  autoScrollToSelected?: boolean;
  skipEntranceAnimation?: boolean;
  scrollContainerMaxHeight?: number;
  disableHoverDetails?: boolean;
  showExpandedRestoreActions?: boolean;
}

export interface HistoryItemCardProps {
  allowMultiSelect: boolean;
  bgColor: string;
  index: number;
  isExpanded: boolean;
  isFirst: boolean;
  isFlipped: boolean;
  isLast: boolean;
  isSelected: boolean;
  item: HistoryItem;
  latestVersion: number;
  onClick: (item: HistoryItem) => void;
  onMouseEnter: (itemId: string) => void;
  onMouseLeave: () => void;
  onRestore?: (version: number) => void;
  selectedForCompare: HistoryItem[];
  showExpandedRestoreActions: boolean;
  showRestoreButton: boolean;
  skipEntranceAnimation: boolean;
}
