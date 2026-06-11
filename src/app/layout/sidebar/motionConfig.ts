export const submenuContainerVariants = {
  open: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
  collapsed: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
} as const;

export const submenuItemVariants = {
  open: {
    opacity: 1,
    transition: {
      opacity: { duration: 0.2 },
    },
  },
  collapsed: {
    opacity: 0,
    transition: {
      opacity: { duration: 0.15 },
    },
  },
} as const;

export const brandTitleVariants = {
  hidden: {
    opacity: 1,
    transition: {
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.026,
      delayChildren: 0.02,
    },
  },
} as const;

export const brandTitleCharacterVariants = {
  hidden: {
    opacity: 0,
    x: -3,
  },
  visible: {
    opacity: 1,
    x: 0,
  },
} as const;

export const sidebarBackgroundTransition = {
  x: { duration: 0.22, ease: 'easeOut' },
  y: { duration: 0.22, ease: 'easeOut' },
  width: { duration: 0.2, ease: 'easeOut' },
  height: { duration: 0.2, ease: 'easeOut' },
  opacity: { duration: 0.12, ease: 'easeOut' },
} as const;
