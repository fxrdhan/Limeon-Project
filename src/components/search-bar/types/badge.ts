export type BadgeType =
  | 'column'
  | 'operator'
  | 'value'
  | 'separator' // For "to" text between Between values
  | 'valueSecond' // For second value in Between operator
  | 'join'
  | 'secondOperator';

export type BadgeColorScheme = {
  bg: string;
  text: string;
  hoverBg: string;
};

export const BADGE_COLORS: Record<BadgeType, BadgeColorScheme> = {
  column: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    hoverBg: 'hover:bg-purple-200',
  },
  operator: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hoverBg: 'hover:bg-blue-200',
  },
  value: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    hoverBg: 'hover:bg-gray-200',
  },
  separator: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    hoverBg: 'hover:bg-slate-100', // No hover effect for separator
  },
  valueSecond: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    hoverBg: 'hover:bg-gray-200',
  },
  join: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    hoverBg: 'hover:bg-orange-200',
  },
  secondOperator: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hoverBg: 'hover:bg-blue-200',
  },
};

export interface BadgeConfig {
  id: string; // Unique identifier for React key
  type: BadgeType;
  label: string;
  onClear: () => void;
  canClear: boolean; // Whether the X button should be shown
  onEdit?: () => void; // Optional edit handler
  canEdit: boolean; // Whether the edit button should be shown
  // Inline editing props
  isEditing?: boolean;
  editingValue?: string;
  onValueChange?: (value: string) => void;
  onEditComplete?: (finalValue?: string) => void;
  // Keyboard navigation selection
  isSelected?: boolean; // Whether badge is selected via keyboard navigation
}
