export type SortDirection = 'asc' | 'desc' | 'original';

export type ColumnConfig = {
  key: string;
  header: string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
};

export type SortState = {
  column: string | null;
  direction: SortDirection;
};
