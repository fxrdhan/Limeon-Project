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
  /** Height per row (default: 36px) */
  rowHeight?: number;
  /** Minimum rows to display (default: 5) */
  minRows?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
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
  rowHeight = 36,
  minRows = 5,
  debug = false,
}: UseDynamicGridHeightOptions) => {
  // Get dynamic table height based on viewport
  const dynamicTableHeight = useTableHeight(viewportOffset);

  // Calculate optimal grid height
  const gridHeight = useMemo(() => {
    // Get available height from viewport (remove 'px' suffix and convert to number)
    const availableHeight = parseInt(dynamicTableHeight.replace('px', ''), 10);
    
    // Calculate maximum rows that can fit in available space
    const maxRowsByViewport = Math.floor((availableHeight - baseHeight) / rowHeight);
    
    // Calculate from data length and page size
    const dataLength = data ? data.length : 0;
    const displayedRows = Math.min(dataLength, currentPageSize);
    
    // Maximum rows is the smaller of: viewport capacity or page size
    const maxRows = Math.min(maxRowsByViewport, currentPageSize);
    
    // Actual rows to display
    const actualRows = Math.max(minRows, Math.min(displayedRows, maxRows));
    
    const calculatedHeight = baseHeight + (actualRows * rowHeight);
    
    if (debug) {
      console.log(`[useDynamicGridHeight] Viewport: ${availableHeight}px, max rows by viewport: ${maxRowsByViewport}, data length: ${dataLength}, displayed rows: ${displayedRows}, actual rows: ${actualRows}, final height: ${calculatedHeight}px`);
    }
    
    return calculatedHeight;
  }, [data, currentPageSize, dynamicTableHeight, baseHeight, rowHeight, minRows, debug]);

  return {
    /** Calculated grid height in pixels */
    gridHeight,
    /** Available viewport height string (e.g., "600px") */
    viewportHeight: dynamicTableHeight,
  };
};