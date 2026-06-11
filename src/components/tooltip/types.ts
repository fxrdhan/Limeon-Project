import type * as React from 'react';
import type { Transition, motion } from 'motion/react';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipContentConfig {
  children: React.ReactNode;
  className?: string;
  layout?: React.ComponentProps<typeof motion.div>['layout'];
  style?: React.ComponentProps<typeof motion.div>['style'];
}

export interface TooltipShowRequest {
  id: string;
  triggerElement: HTMLElement;
  side: TooltipSide;
  sideOffset: number;
  align: TooltipAlign;
  alignOffset: number;
  content: TooltipContentConfig;
}

export interface TooltipProviderValue {
  isProvided: boolean;
  openDelay: number;
  closeDelay: number;
  transition: Transition;
  showTooltip: (request: TooltipShowRequest) => void;
  hideTooltip: (id: string) => void;
}

export interface TooltipValue {
  setContent: (content: TooltipContentConfig) => void;
}

export interface TooltipProviderProps {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  transition?: Transition;
}

export interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  side?: TooltipSide;
  sideOffset?: number;
  align?: TooltipAlign;
  alignOffset?: number;
}

export interface TooltipTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  layout?: React.ComponentProps<typeof motion.div>['layout'];
  style?: React.ComponentProps<typeof motion.div>['style'];
  asChild?: boolean;
}

export interface TooltipSize {
  width: number;
  height: number;
}

export interface TooltipGeometry {
  bubbleX: number;
  bubbleY: number;
  hiddenBubbleX: number;
  hiddenBubbleY: number;
  arrowOffset: number;
  width: number;
  height: number;
}
