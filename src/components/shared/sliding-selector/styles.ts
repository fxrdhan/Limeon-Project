import type {
  SlidingSelectorAnimationPreset,
  SlidingSelectorOption,
  SlidingSelectorShape,
  SlidingSelectorSize,
} from './types';

export const ANIMATION_PRESETS: Record<
  SlidingSelectorAnimationPreset,
  {
    container: { stiffness: number; damping: number; duration: number };
    background: { stiffness: number; damping: number; duration: number };
  }
> = {
  smooth: {
    container: { stiffness: 260, damping: 32, duration: 0.85 },
    background: { stiffness: 320, damping: 34, duration: 0.5 },
  },
  snappy: {
    container: { stiffness: 420, damping: 30, duration: 0.6 },
    background: { stiffness: 460, damping: 30, duration: 0.38 },
  },
  fluid: {
    container: { stiffness: 220, damping: 36, duration: 1 },
    background: { stiffness: 260, damping: 38, duration: 0.65 },
  },
};

export const DIRECT_HOVER_TRANSITION = {
  duration: 0.22,
  ease: 'easeOut',
} as const;

export const DIRECT_DROPDOWN_TRANSITION = {
  duration: 0.32,
  ease: 'easeOut',
} as const;

export const CHEVRON_EXIT_TRANSITION = {
  duration: 0.18,
  delay: 0.28,
  ease: 'easeOut',
} as const;

export const CHEVRON_ROTATE_TRANSITION = {
  duration: 0.28,
  ease: 'easeInOut',
} as const;

export const ACTIVE_FILL_DELAYED_TRANSITION = {
  duration: 0.26,
  delay: 0.28,
  ease: 'easeOut',
} as const;

export const ACTIVE_FILL_COLLAPSE_TRANSITION = {
  duration: 0.32,
  ease: 'easeInOut',
} as const;

export const SIZE_CLASSES: Record<
  SlidingSelectorSize,
  {
    container: string;
    button: string;
    text: string;
    label: string;
  }
> = {
  sm: {
    container: 'p-0.5',
    button: 'px-2 py-1 text-sm',
    text: 'text-sm',
    label: 'h-5 leading-5',
  },
  md: {
    container: 'p-1',
    button: 'px-3 py-1.5',
    text: 'text-base',
    label: 'h-6 leading-6',
  },
  lg: {
    container: 'p-1.5',
    button: 'px-6 py-3 text-lg',
    text: 'text-lg',
    label: 'h-7 leading-7',
  },
};

export const SHAPE_CLASSES: Record<
  SlidingSelectorShape,
  {
    container: string;
    button: string;
    background: string;
  }
> = {
  rounded: {
    container: 'rounded-xl',
    button: 'rounded-xl',
    background: 'rounded-xl',
  },
  pill: {
    container: 'rounded-full',
    button: 'rounded-full',
    background: 'rounded-full',
  },
};

export const canUseHoverPointer = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const getSlidingSelectorDisplayLabel = <T>(
  option: SlidingSelectorOption<T>,
  isActive: boolean
) => {
  if (isActive && option.activeLabel) {
    return option.activeLabel;
  }

  return option.defaultLabel;
};
