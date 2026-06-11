import type { TooltipGeometry } from './types';

export const defaultTooltipTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 35,
} as const;

export const tooltipAppearTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 24,
  mass: 0.75,
} as const;

export const tooltipExitTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 30,
  mass: 0.65,
} as const;

export const tooltipRepositionTransition = {
  type: 'tween',
  duration: 0.22,
  ease: 'easeOut',
} as const;

export const defaultTooltipGeometry: TooltipGeometry = {
  bubbleX: 0,
  bubbleY: 0,
  hiddenBubbleX: 0,
  hiddenBubbleY: -4,
  arrowOffset: 0,
  width: 0,
  height: 0,
};

export const TOOLTIP_ARROW_SIZE = 12;
export const TOOLTIP_HIDDEN_SCALE = 0.45;
export const TOOLTIP_GEOMETRY_EPSILON = 0.5;
