import type { HoverDetailData } from '@/types/components';

export type ComboboxHoverDetailPosition = {
  top: number;
  left: number;
  boundaryBottom?: number;
  boundaryTop?: number;
  direction: 'left' | 'right';
  anchorCenterY: number;
  maxWidth: number;
};

export type ComboboxHoverDetailGeometry = {
  x: number;
  y: number;
  hiddenX: number;
  hiddenY: number;
  width: number;
  height: number;
};

export type ComboboxHoverDetailSize = {
  width: number;
  height: number;
};

export type ComboboxHoverDetailSourceData = Partial<HoverDetailData>;
