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
export const DATEPICKER_CONSTANTS = {
  // Positioning
  CALENDAR_HEIGHT: 320,
  VIEWPORT_MARGIN: 16,
  POSITION_MARGIN: 5,

  // Animation timing
  ANIMATION_DURATION: 200,
  FOCUS_DELAY: 0,
  PORTAL_FOCUS_DELAY: 100,

  // Hover timeouts
  HOVER_OPEN_DELAY: 150,
  HOVER_CLOSE_DELAY: 200,

  // Calendar dimensions
  CALENDAR_WIDTH: 280,

  // Grid layouts
  DAYS_PER_WEEK: 7,
  MONTHS_PER_ROW: 3,
  YEARS_PER_ROW: 3,
  YEARS_PER_DECADE: 12,

  // Navigation
  DAYS_PER_WEEK_NAVIGATION: 7,
  MONTHS_PER_YEAR: 12,
  DECADE_SHIFT: 10,

  // Z-index
  PORTAL_Z_INDEX: 1050,
} as const;

// Years grid configuration
export const getYearsToDisplay = (year: number): number[] => {
  const startYear =
    Math.floor(year / DATEPICKER_CONSTANTS.DECADE_SHIFT) *
    DATEPICKER_CONSTANTS.DECADE_SHIFT;
  return Array.from(
    { length: DATEPICKER_CONSTANTS.YEARS_PER_DECADE },
    (_, i) => startYear + i - 1
  );
};

// Date formatting configuration
export const DATE_FORMAT_CONFIG = {
  locale: 'id-ID',
  dayMonthYear: {
    day: '2-digit' as const,
    month: 'short' as const,
    year: 'numeric' as const,
  },
  monthYear: {
    month: 'long' as const,
    year: 'numeric' as const,
  },
} as const;
