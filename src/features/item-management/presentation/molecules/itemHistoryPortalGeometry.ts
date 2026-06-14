export const ITEM_HISTORY_PORTAL_MARGIN = 16;
export const ITEM_HISTORY_PORTAL_WIDTH = 350;
export const ITEM_HISTORY_PORTAL_TAB_WIDTH = 180;
export const ITEM_HISTORY_PORTAL_TAB_HEIGHT = 44;
export const ITEM_HISTORY_PORTAL_RADIUS = 16;

interface ItemHistoryPortalTriggerRect {
  top: number;
  right: number;
}

export const getItemHistoryPortalPosition = ({
  triggerRect,
  viewportWidth,
  viewportHeight,
}: {
  triggerRect: ItemHistoryPortalTriggerRect;
  viewportWidth: number;
  viewportHeight: number;
}) => {
  const width = Math.min(
    ITEM_HISTORY_PORTAL_WIDTH,
    viewportWidth - ITEM_HISTORY_PORTAL_MARGIN * 2
  );
  const right = Math.min(
    viewportWidth - ITEM_HISTORY_PORTAL_MARGIN,
    triggerRect.right
  );
  const left = Math.max(ITEM_HISTORY_PORTAL_MARGIN, right - width);
  const top = Math.max(ITEM_HISTORY_PORTAL_MARGIN, triggerRect.top - 12);
  const availableHeight = viewportHeight - top - ITEM_HISTORY_PORTAL_MARGIN;
  const bodyMaxHeight = Math.max(
    180,
    availableHeight - ITEM_HISTORY_PORTAL_TAB_HEIGHT + 1
  );

  return {
    top,
    left,
    width,
    bodyMaxHeight,
    bodyMinHeight: Math.min(460, bodyMaxHeight),
  };
};

export const getItemHistoryPortalShape = ({
  width,
  bodyMinHeight,
}: {
  width: number;
  bodyMinHeight: number;
}) => {
  const surfaceHeight = ITEM_HISTORY_PORTAL_TAB_HEIGHT + bodyMinHeight;
  const tabLeft = Math.max(
    ITEM_HISTORY_PORTAL_RADIUS * 2,
    width - ITEM_HISTORY_PORTAL_TAB_WIDTH
  );
  const path = [
    `M 0 ${ITEM_HISTORY_PORTAL_TAB_HEIGHT + ITEM_HISTORY_PORTAL_RADIUS}`,
    `Q 0 ${ITEM_HISTORY_PORTAL_TAB_HEIGHT} ${ITEM_HISTORY_PORTAL_RADIUS} ${ITEM_HISTORY_PORTAL_TAB_HEIGHT}`,
    `H ${tabLeft - ITEM_HISTORY_PORTAL_RADIUS}`,
    `Q ${tabLeft} ${ITEM_HISTORY_PORTAL_TAB_HEIGHT} ${tabLeft} ${ITEM_HISTORY_PORTAL_TAB_HEIGHT - ITEM_HISTORY_PORTAL_RADIUS}`,
    `V ${ITEM_HISTORY_PORTAL_RADIUS}`,
    `Q ${tabLeft} 0 ${tabLeft + ITEM_HISTORY_PORTAL_RADIUS} 0`,
    `H ${width - ITEM_HISTORY_PORTAL_RADIUS}`,
    `Q ${width} 0 ${width} ${ITEM_HISTORY_PORTAL_RADIUS}`,
    `V ${surfaceHeight - ITEM_HISTORY_PORTAL_RADIUS}`,
    `Q ${width} ${surfaceHeight} ${width - ITEM_HISTORY_PORTAL_RADIUS} ${surfaceHeight}`,
    `H ${ITEM_HISTORY_PORTAL_RADIUS}`,
    `Q 0 ${surfaceHeight} 0 ${surfaceHeight - ITEM_HISTORY_PORTAL_RADIUS}`,
    `V ${ITEM_HISTORY_PORTAL_TAB_HEIGHT + ITEM_HISTORY_PORTAL_RADIUS}`,
    'Z',
  ].join(' ');

  return {
    path,
    surfaceHeight,
  };
};
