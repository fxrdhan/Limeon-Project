export const SEARCH_CONSTANTS = {
  ANIMATION_DURATION: 300,
  ANIMATION_OPENING_DURATION: 200,
  ANIMATION_CLOSING_DURATION: 150,
  DEBOUNCE_DELAY: 150,
  FUZZY_SEARCH_THRESHOLD: -1000,
  SELECTOR_MAX_HEIGHT: '320px',
  INPUT_FOCUS_DELAY: 50, // Increased from 0 to ensure React DOM updates complete before cursor positioning
  BADGE_WIDTH_FALLBACK: 60,
  BADGE_MARGIN: 16,
} as const;

export const SEARCH_STATES = {
  IDLE: 'idle',
  TYPING: 'typing',
  FOUND: 'found',
  NOT_FOUND: 'not-found',
} as const;

export const SEARCH_MODES = {
  GLOBAL: 'global',
  COLUMN_SELECTOR: 'column-selector',
  OPERATOR_SELECTOR: 'operator-selector',
  FILTER: 'filter',
} as const;

export const KEY_CODES = {
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
} as const;

export type SearchState = (typeof SEARCH_STATES)[keyof typeof SEARCH_STATES];
export type SearchMode = (typeof SEARCH_MODES)[keyof typeof SEARCH_MODES];
export type AnimationPhase = 'hidden' | 'opening' | 'open' | 'closing';

export { DEFAULT_FILTER_OPERATORS } from './operators';
