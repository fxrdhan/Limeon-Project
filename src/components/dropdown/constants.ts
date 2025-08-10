export const DROPDOWN_CONSTANTS = {
  ANIMATION_DURATION: 100,
  CLOSE_TIMEOUT: 200,
  HOVER_TIMEOUT: 100,
  DEBOUNCE_DELAY: 150,
  FOCUS_DELAY: 50,
  SEARCH_FOCUS_DELAY: 5,
  VIEWPORT_MARGIN: 16,
  DROPDOWN_MARGIN: 4,
  DROPDOWN_SPACING: 2,
  MAX_HEIGHT: 240, // 60 * 4 (tailwind max-h-60)
  SCROLL_THRESHOLD: 2,
  PAGE_SIZE: 5,
  BUTTON_PADDING: 48,
  RADIO_EXTRA_PADDING: 24,
  // Z-index for dropdown portal (higher than calendar portal)
  PORTAL_Z_INDEX: 1060,
} as const;

export const KEYBOARD_KEYS = {
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  TAB: 'Tab',
  PAGE_DOWN: 'PageDown',
  PAGE_UP: 'PageUp',
  ENTER: 'Enter',
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

export type SearchState = (typeof SEARCH_STATES)[keyof typeof SEARCH_STATES];
export type DropDirection = 'up' | 'down';
