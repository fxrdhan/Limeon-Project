import type { DropdownOption, HoverDetailData } from '@/types';

export type DropdownValue = string | string[];

export type VirtualItem = {
  index: number;
  start: number;
  option: DropdownOption;
};

export type HoverDetailPosition = {
  top: number;
  left: number;
  direction: 'left' | 'right';
  anchorCenterY: number;
};

export type HoverDetailGeometry = {
  x: number;
  y: number;
  hiddenX: number;
  hiddenY: number;
  width: number;
  height: number;
};

export type HoverDetailSize = {
  width: number;
  height: number;
};

export type HoverDetailSourceData = Partial<HoverDetailData>;
