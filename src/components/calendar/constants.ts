// Indonesian month names
export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// Day labels for calendar grid
export const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Calendar configuration constants
export const CALENDAR_CONSTANTS = {
  // Positioning
  VIEWPORT_MARGIN: 16,
  POSITION_MARGIN: 5,

  // Animation timing
  CLOSE_ANIMATION_DURATION: 200,
  OPENING_READY_DELAY: 150,
  FOCUS_RESTORE_DELAY: 250,
  NAVIGATION_ANIMATION_DURATION: 300,
  GRID_TRANSITION_DURATION: 250,
  PORTAL_TRANSITION_DURATION: 150,
  INPUT_TRANSITION_DURATION: 200,

  // Hover timeouts
  HOVER_OPEN_DELAY: 150,
  HOVER_CLOSE_DELAY: 200,

  // Calendar dimensions
  CALENDAR_WIDTH: 320,

  // Z-index (lower than dropdown portal to allow header dropdowns to appear on top)
  PORTAL_Z_INDEX: 1000,
} as const;

// Calendar size presets
export const CALENDAR_SIZE_PRESETS = {
  md: {
    width: 320,
  },
  lg: {
    width: 380,
  },
  xl: {
    width: 450,
  },
} as const;

export const DEFAULT_CALENDAR_YEAR_WINDOW = {
  future: 50,
  past: 50,
} as const;
