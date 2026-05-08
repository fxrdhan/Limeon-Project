import type React from 'react';
import type { DropdownProps } from '@/types';

export const getPopupSide = (position: DropdownProps['position']) => {
  if (position === 'top' || position === 'bottom' || position === 'left') {
    return position;
  }

  return 'bottom';
};

export const getPopupAlign = (align: DropdownProps['align']) =>
  align === 'left' ? 'start' : 'end';

export const getPopupWidth = (
  portalWidth: DropdownProps['portalWidth']
): React.CSSProperties => {
  if (portalWidth === undefined || portalWidth === 'auto') {
    return { width: 'var(--anchor-width)' };
  }

  return {
    width: typeof portalWidth === 'number' ? `${portalWidth}px` : portalWidth,
  };
};
