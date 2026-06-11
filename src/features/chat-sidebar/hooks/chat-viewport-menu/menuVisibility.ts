import { CHAT_HEADER_OVERLAY_HEIGHT, MENU_GAP } from '../../constants';
import type {
  MenuPlacement,
  MenuSideAnchor,
  MenuVerticalAnchor,
} from '../../types';
import {
  isAnchorVisibleWithinViewport,
  type VisibleBounds,
} from '../../utils/chatViewportMenu';

interface ProjectedMenuRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface MenuLayoutState {
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  menuVerticalAnchor: MenuVerticalAnchor;
  menuOffsetX: number;
}

export type MenuVisibilityAdjustment =
  | { kind: 'close' }
  | { kind: 'placement'; menuPlacement: MenuPlacement }
  | { kind: 'vertical-anchor'; menuVerticalAnchor: MenuVerticalAnchor }
  | { kind: 'offset-x'; menuOffsetX: number };

const getProjectedMenuRect = ({
  anchorRect,
  menuPlacement,
  menuSideAnchor,
  menuVerticalAnchor,
  menuOffsetX,
  menuWidth,
  menuHeight,
}: MenuLayoutState & {
  anchorRect: DOMRect;
  menuWidth: number;
  menuHeight: number;
}): ProjectedMenuRect => {
  let top = anchorRect.top;
  let left = anchorRect.left;

  if (menuPlacement === 'left' || menuPlacement === 'right') {
    top =
      menuSideAnchor === 'bottom'
        ? anchorRect.bottom - menuHeight
        : menuSideAnchor === 'top'
          ? anchorRect.top
          : anchorRect.top + (anchorRect.height - menuHeight) / 2;
    left =
      menuPlacement === 'left'
        ? anchorRect.left - MENU_GAP - menuWidth
        : anchorRect.right + MENU_GAP;
  } else {
    left =
      menuVerticalAnchor === 'right'
        ? anchorRect.right - menuWidth
        : anchorRect.left;
    top =
      menuPlacement === 'down'
        ? anchorRect.top - MENU_GAP - menuHeight
        : anchorRect.bottom + MENU_GAP;
  }

  left += menuOffsetX;

  return {
    top,
    bottom: top + menuHeight,
    left,
    right: left + menuWidth,
    width: menuWidth,
    height: menuHeight,
  };
};

const getVerticalMenuOverflow = ({
  rect,
  minVisibleTop,
  maxVisibleBottom,
}: {
  rect: Pick<DOMRect, 'top' | 'bottom'>;
  minVisibleTop: number;
  maxVisibleBottom: number;
}) =>
  Math.max(minVisibleTop - rect.top, 0) +
  Math.max(rect.bottom - maxVisibleBottom, 0);

export const getMessageMenuElement = (
  menuRoot: ParentNode,
  messageId: string
) => menuRoot.querySelector<HTMLElement>(`[data-chat-menu-id="${messageId}"]`);

export const resolveVisibleMenuAdjustment = ({
  menuElement,
  bounds,
  anchor,
  menuPlacement,
  menuSideAnchor,
  menuVerticalAnchor,
  menuOffsetX,
}: {
  menuElement: HTMLElement;
  bounds: VisibleBounds;
  anchor: HTMLElement | null;
} & MenuLayoutState): MenuVisibilityAdjustment => {
  let anchorRect: DOMRect | null = null;
  if (anchor) {
    anchorRect = anchor.getBoundingClientRect();
    if (!isAnchorVisibleWithinViewport(bounds, anchorRect)) {
      return { kind: 'close' };
    }
  }

  const { containerRect } = bounds;
  const measuredMenuRect = menuElement.getBoundingClientRect();
  const menuWidth = menuElement.offsetWidth || measuredMenuRect.width;
  const menuHeight = menuElement.offsetHeight || measuredMenuRect.height;
  const menuRect =
    anchorRect !== null
      ? getProjectedMenuRect({
          anchorRect,
          menuPlacement,
          menuSideAnchor,
          menuVerticalAnchor,
          menuOffsetX,
          menuWidth,
          menuHeight,
        })
      : {
          top: measuredMenuRect.top,
          bottom: measuredMenuRect.bottom,
          left: measuredMenuRect.left,
          right: measuredMenuRect.right,
          width: measuredMenuRect.width,
          height: measuredMenuRect.height,
        };
  const minVisibleTop =
    containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT + MENU_GAP;
  const maxVisibleBottom = bounds.visibleBottom - MENU_GAP;
  const currentVerticalOverflow = getVerticalMenuOverflow({
    rect: menuRect,
    minVisibleTop,
    maxVisibleBottom,
  });

  if (currentVerticalOverflow > 0 && anchorRect) {
    const upMenuRect = getProjectedMenuRect({
      anchorRect,
      menuPlacement: 'up',
      menuSideAnchor,
      menuVerticalAnchor,
      menuOffsetX,
      menuWidth,
      menuHeight,
    });
    const downMenuRect = getProjectedMenuRect({
      anchorRect,
      menuPlacement: 'down',
      menuSideAnchor,
      menuVerticalAnchor,
      menuOffsetX,
      menuWidth,
      menuHeight,
    });
    const upOverflow = getVerticalMenuOverflow({
      rect: upMenuRect,
      minVisibleTop,
      maxVisibleBottom,
    });
    const downOverflow = getVerticalMenuOverflow({
      rect: downMenuRect,
      minVisibleTop,
      maxVisibleBottom,
    });
    const nextPlacement: MenuPlacement =
      upOverflow <= downOverflow ? 'up' : 'down';

    if (
      menuPlacement !== nextPlacement &&
      Math.min(upOverflow, downOverflow) < currentVerticalOverflow
    ) {
      return {
        kind: 'placement',
        menuPlacement: nextPlacement,
      };
    }
  }

  const minMenuLeft = containerRect.left + MENU_GAP;
  const maxMenuRight = containerRect.right - MENU_GAP;

  if (
    (menuPlacement === 'up' || menuPlacement === 'down') &&
    anchorRect !== null
  ) {
    const leftAnchoredOverflow =
      Math.max(minMenuLeft - anchorRect.left, 0) +
      Math.max(anchorRect.left + menuRect.width - maxMenuRight, 0);
    const rightAnchoredLeft = anchorRect.right - menuRect.width;
    const rightAnchoredOverflow =
      Math.max(minMenuLeft - rightAnchoredLeft, 0) +
      Math.max(anchorRect.right - maxMenuRight, 0);
    const nextVerticalAnchor: MenuVerticalAnchor =
      leftAnchoredOverflow <= rightAnchoredOverflow ? 'left' : 'right';

    if (menuVerticalAnchor !== nextVerticalAnchor) {
      return {
        kind: 'vertical-anchor',
        menuVerticalAnchor: nextVerticalAnchor,
      };
    }
  }

  const shiftMin = minMenuLeft - menuRect.left;
  const shiftMax = maxMenuRight - menuRect.right;
  const nextOffsetX =
    shiftMin > shiftMax ? shiftMin : Math.min(Math.max(0, shiftMin), shiftMax);

  return {
    kind: 'offset-x',
    menuOffsetX: nextOffsetX,
  };
};
