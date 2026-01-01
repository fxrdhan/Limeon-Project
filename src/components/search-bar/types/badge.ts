export type BadgeType =
  | 'column'
  | 'operator'
  | 'value'
  | 'separator' // For "to" text between Between values
  | 'valueTo' // For "to" value in Between operator
  | 'join'
  | 'operatorN' // Operator at condition index > 0
  | 'groupOpen'
  | 'groupClose';

export type BadgeColorScheme = {
  bg: string;
  text: string;
  hoverBg: string;
  glow: string; // Glow effect for selected state
};

export const BADGE_COLORS: Record<BadgeType, BadgeColorScheme> = {
  column: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    hoverBg: 'hover:bg-purple-200',
    glow: 'shadow-[0_0_12px_rgba(192,132,252,0.5),0_0_24px_rgba(192,132,252,0.3)]',
  },
  operator: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hoverBg: 'hover:bg-blue-200',
    glow: 'shadow-[0_0_12px_rgba(96,165,250,0.5),0_0_24px_rgba(96,165,250,0.3)]',
  },
  value: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    hoverBg: 'hover:bg-gray-200',
    glow: 'shadow-[0_0_12px_rgba(156,163,175,0.5),0_0_24px_rgba(156,163,175,0.3)]',
  },
  separator: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    hoverBg: 'hover:bg-slate-100', // No hover effect for separator
    glow: '', // Separator cannot be selected
  },
  valueTo: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    hoverBg: 'hover:bg-gray-200',
    glow: 'shadow-[0_0_12px_rgba(156,163,175,0.5),0_0_24px_rgba(156,163,175,0.3)]',
  },
  join: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    hoverBg: 'hover:bg-orange-200',
    glow: 'shadow-[0_0_12px_rgba(251,146,60,0.5),0_0_24px_rgba(251,146,60,0.3)]',
  },
  operatorN: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hoverBg: 'hover:bg-blue-200',
    glow: 'shadow-[0_0_12px_rgba(96,165,250,0.5),0_0_24px_rgba(96,165,250,0.3)]',
  },
  groupOpen: {
    bg: 'bg-slate-200',
    text: 'text-slate-700',
    hoverBg: 'hover:bg-slate-300',
    glow: '',
  },
  groupClose: {
    bg: 'bg-slate-200',
    text: 'text-slate-700',
    hoverBg: 'hover:bg-slate-300',
    glow: '',
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
  // Keyboard navigation - called when Ctrl+E/Ctrl+Shift+E pressed during inline edit
  // direction: 'left' for Ctrl+E, 'right' for Ctrl+Shift+E
  onNavigateEdit?: (direction: 'left' | 'right') => void;
  // Called when Ctrl+I pressed during inline edit to focus main input
  onFocusInput?: () => void;
  // Hover state hook to trigger layout re-measurement
  onHoverChange?: (isHovered: boolean) => void;
  // Keyboard navigation selection
  isSelected?: boolean; // Whether badge is selected via keyboard navigation
  // Column type for value validation (only for value badges)
  columnType?: 'text' | 'number' | 'date' | 'currency';
}
