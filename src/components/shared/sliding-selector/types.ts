import type React from 'react';

export type SlidingSelectorVariant = 'tabs' | 'selector';
export type SlidingSelectorSize = 'sm' | 'md' | 'lg';
export type SlidingSelectorShape = 'rounded' | 'pill';
export type SlidingSelectorExpandDirection = 'horizontal' | 'vertical';
export type SlidingSelectorAnimationPreset = 'smooth' | 'snappy' | 'fluid';

export interface SlidingSelectorOption<T = unknown> {
  key: string;
  value: T;
  defaultLabel: string;
  activeLabel?: string;
  disabled?: boolean;
}

export interface SlidingSelectorProps<T = unknown> {
  options: SlidingSelectorOption<T>[];
  activeKey: string;
  onSelectionChange: (key: string, value: T, event?: React.MouseEvent) => void;
  variant?: SlidingSelectorVariant;
  size?: SlidingSelectorSize;
  shape?: SlidingSelectorShape;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  autoCollapseDelay?: number;
  expandOnHover?: boolean;
  expandDirection?: SlidingSelectorExpandDirection;
  layoutId?: string;
  animationPreset?: SlidingSelectorAnimationPreset;
  collapseSignal?: number;
  className?: string;
  disabled?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}
