import type { HoverDetailData } from '@/types/components';

export type ComboboxHoverDetailPosition = {
  top: number;
  left: number;
  direction: 'left' | 'right';
  anchorCenterY: number;
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
