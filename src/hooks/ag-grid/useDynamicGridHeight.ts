import { useMemo } from 'react';
import { useTableHeight } from './useTableHeight';

interface UseDynamicGridHeightOptions {
  /** Data array to calculate rows from */
  data?: unknown[];
  /** Current page size from pagination */
  currentPageSize: number;
  /** Viewport offset for other UI elements (default: 320px) */
  viewportOffset?: number;
  /** Base height for grid header and padding (default: 108px) */
  baseHeight?: number;
  /** Height per row (default: 32px) */
  rowHeight?: number;
  /** Minimum rows to display (default: 5) */
  minRows?: number;
}

/**
 * Custom hook for calculating dynamic AG Grid height based on viewport and data
 * Replaces manual calculateGridHeight logic across components
 */
export const useDynamicGridHeight = ({
  data = [],
  currentPageSize,
  viewportOffset = 320,
  baseHeight = 108,
  rowHeight = 32,
  minRows = 5,
}: UseDynamicGridHeightOptions) => {
  // Get dynamic table height based on viewport
  const dynamicTableHeight = useTableHeight(viewportOffset);

  // Calculate optimal grid height
  const gridHeight = useMemo(() => {
    // Get available height from viewport (remove 'px' suffix and convert to number)
    const availableHeight = parseInt(dynamicTableHeight.replace('px', ''), 10);

    // Calculate maximum rows that can fit in available space
    const maxRowsByViewport = Math.floor(
      (availableHeight - baseHeight) / rowHeight
    );

    // Calculate from data length and page size
    const dataLength = data ? data.length : 0;

    // Handle unlimited page size (-1)
    const effectivePageSize =
      currentPageSize === -1 ? dataLength : currentPageSize;

    const displayedRows = Math.min(dataLength, effectivePageSize);

    // Maximum rows is the smaller of: viewport capacity or effective page size
    const maxRows = Math.min(maxRowsByViewport, effectivePageSize);

    // Actual rows to display
    const actualRows = Math.max(minRows, Math.min(displayedRows, maxRows));

    const calculatedHeight = baseHeight + actualRows * rowHeight;

    return calculatedHeight;
  }, [
    data,
    currentPageSize,
    dynamicTableHeight,
    baseHeight,
    rowHeight,
    minRows,
  ]);

  return {
    /** Calculated grid height in pixels */
    gridHeight,
    /** Available viewport height string (e.g., "600px") */
    viewportHeight: dynamicTableHeight,
  };
};
