export const PAGINATION_CONSTANTS = {
  // Animation values
  ANIMATION: {
    ENTER_X: 20,
    EXIT_X: 20,
    FLOATING_SCALE_INITIAL: 0.8,
    FLOATING_Y_INITIAL: 200,
    FLOATING_SCALE_ANIMATE: 1,
    FLOATING_Y_ANIMATE: 0,
    SPRING_STIFFNESS: 500,
    SPRING_DAMPING: 30,
    SPRING_DURATION: 0.3,
    PAGE_SPRING_STIFFNESS: 300,
    PAGE_SPRING_DAMPING: 20,
    FLOATING_SPRING_STIFFNESS: 400,
    FLOATING_SPRING_DAMPING: 25,
  },

  // Intersection Observer settings
  FLOATING: {
    THRESHOLD: 0.5,
    ROOT_MARGIN: '0px',
    MIN_WIDTH: '400px',
    Z_INDEX: 9998,
  },

  // Page sizes
  PAGE_SIZES: [25, 50, 100, -1] as const,

  // Styling
  STYLES: {
    FLOATING_BACKGROUND: 'oklch(1 0 57 / 30%)',
    BACKDROP_FILTER: 'blur(4px)',
    WEBKIT_BACKDROP_FILTER: 'blur(4px)',
    BORDER_RADIUS: '9999px',
  },

  // Aria labels
  ARIA_LABELS: {
    PREVIOUS_PAGE: 'Halaman sebelumnya',
    NEXT_PAGE: 'Halaman berikutnya',
  },
} as const;
