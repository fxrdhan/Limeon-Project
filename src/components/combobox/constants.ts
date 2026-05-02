import type { ResolvedComboboxLabels } from '@/types';

export const COMBOBOX_CONSTANTS = {
  ANIMATION_DURATION: 100,
  CLOSE_TIMEOUT: 200,
  HOVER_TIMEOUT: 100,
  DEBOUNCE_DELAY: 150,
  FOCUS_DELAY: 50,
  SEARCH_FOCUS_DELAY: 5,
  VIEWPORT_MARGIN: 16,
  COMBOBOX_MARGIN: 4,
  COMBOBOX_SPACING: 2,
  MAX_HEIGHT: 240, // 60 * 4 (tailwind max-h-60)
  SCROLL_THRESHOLD: 2,
  PAGE_SIZE: 5,
  KEYBOARD_SCROLL_HIGHLIGHT_MAX_HOLD: 700,
  BUTTON_PADDING: 48,
  RADIO_EXTRA_PADDING: 24,
  VIRTUALIZATION_THRESHOLD: 100,
  VIRTUALIZATION_OVERSCAN: 6,
  OPTION_ESTIMATED_HEIGHT: 36,
  HOVER_DETAIL_SCROLL_IDLE_DELAY: 140,
  // Z-index for combobox portal (higher than calendar portal)
  PORTAL_Z_INDEX: 1060,
} as const;

export const KEYBOARD_KEYS = {
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
  PAGE_DOWN: 'PageDown',
  PAGE_UP: 'PageUp',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
} as const;

export const SEARCH_STATES = {
  IDLE: 'idle',
  TYPING: 'typing',
  FOUND: 'found',
  NOT_FOUND: 'not-found',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'Pilihan harus diisi',
  NO_OPTIONS: 'Tidak ada pilihan yang sesuai',
  ADD_NEW_HINT: 'Tekan Enter untuk menambahkan data baru',
} as const;

export const DEFAULT_COMBOBOX_LABELS: ResolvedComboboxLabels = {
  listbox: 'Daftar pilihan',
  search: 'Cari pilihan',
  searchPlaceholder: 'Cari...',
  addNew: 'Tambah data baru',
  noOptions: VALIDATION_MESSAGES.NO_OPTIONS,
  addNewHint: VALIDATION_MESSAGES.ADD_NEW_HINT,
  required: VALIDATION_MESSAGES.REQUIRED,
  popup: triggerLabel => `${triggerLabel} pilihan`,
};

export type SearchState = (typeof SEARCH_STATES)[keyof typeof SEARCH_STATES];
export type DropDirection = 'up' | 'down';
