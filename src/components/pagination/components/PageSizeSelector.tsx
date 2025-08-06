import React from 'react';
import {
  SlidingSelector,
  SlidingSelectorOption,
} from '@/components/shared/sliding-selector';
import type { PageSizeSelectorProps } from '../types';

export const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSizes,
  currentSize,
  onSizeChange,
  isFloating = false,
}) => {
  // Transform pageSizes to SlidingSelector format
  const sizeOptions: SlidingSelectorOption<number>[] = pageSizes.map(size => ({
    key: size.toString(),
    value: size,
    defaultLabel: size.toString(),
    activeLabel: `${size} items`,
  }));

  const handleSelectionChange = (
    _key: string,
    value: number,
    event?: React.MouseEvent
  ) => {
    // onSizeChange expects both parameters, provide event or create a synthetic one
    const mouseEvent = event || ({} as React.MouseEvent);
    onSizeChange(value, mouseEvent);
  };

  return (
    <SlidingSelector
      options={sizeOptions}
      activeKey={currentSize.toString()}
      onSelectionChange={handleSelectionChange}
      variant="selector"
      size="md"
      shape="pill"
      collapsible={false}
      layoutId={isFloating ? 'floating-selector' : 'main-selector'}
      animationPreset="smooth"
    />
  );
};
