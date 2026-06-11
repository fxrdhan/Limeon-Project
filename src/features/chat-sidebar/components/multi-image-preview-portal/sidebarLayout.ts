export const THUMBNAIL_GRID_GAP = 16;
export const THUMBNAIL_GRID_HORIZONTAL_PADDING = 32;
export const BASE_THUMBNAIL_TILE_SIZE = 116;
export const THUMBNAIL_SCALE_STEP = 0.85;
export const buildThumbnailTileSize = (columnCount: number) =>
  Math.round(
    BASE_THUMBNAIL_TILE_SIZE * THUMBNAIL_SCALE_STEP ** (columnCount - 1)
  );

export const SIDEBAR_LAYOUT_LEVELS = [1, 2, 3, 4].map(columnCount => {
  const tileSize = buildThumbnailTileSize(columnCount);

  return {
    columnCount,
    tileSize,
    width:
      THUMBNAIL_GRID_HORIZONTAL_PADDING +
      tileSize * columnCount +
      THUMBNAIL_GRID_GAP * Math.max(0, columnCount - 1),
  };
});

export const DEFAULT_SIDEBAR_WIDTH =
  SIDEBAR_LAYOUT_LEVELS.find(level => level.columnCount === 2)?.width ?? 280;
export const ONE_COLUMN_SIDEBAR_WIDTH =
  SIDEBAR_LAYOUT_LEVELS.find(level => level.columnCount === 1)?.width ?? 148;
export const FOUR_COLUMN_SIDEBAR_WIDTH =
  SIDEBAR_LAYOUT_LEVELS.find(level => level.columnCount === 4)?.width ?? 544;
export const MIN_SIDEBAR_WIDTH = ONE_COLUMN_SIDEBAR_WIDTH;
export const MAX_SIDEBAR_WIDTH = FOUR_COLUMN_SIDEBAR_WIDTH;
export const MIN_PREVIEW_PANE_WIDTH = 360;
export const INITIAL_CONTAINER_HEIGHT =
  typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.92) : 0;

export const buildThumbnailGridHeight = (
  columnCount: number,
  itemCount: number
) => {
  const tileSize = buildThumbnailTileSize(columnCount);
  const rowCount = Math.ceil(itemCount / columnCount);

  return (
    THUMBNAIL_GRID_HORIZONTAL_PADDING +
    tileSize * rowCount +
    THUMBNAIL_GRID_GAP * Math.max(0, rowCount - 1)
  );
};

export const getDefaultSidebarWidth = (
  itemCount: number,
  availableHeight: number
) => {
  if (availableHeight <= 0) {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  const fittedLevel = SIDEBAR_LAYOUT_LEVELS.find(
    level =>
      buildThumbnailGridHeight(level.columnCount, itemCount) <= availableHeight
  );

  return fittedLevel?.width ?? DEFAULT_SIDEBAR_WIDTH;
};

export const THUMBNAIL_LAYOUT_TRANSITION = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.85,
};
