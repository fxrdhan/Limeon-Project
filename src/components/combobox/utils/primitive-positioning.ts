import {
  useLayoutEffect,
  useMemo,
  type CSSProperties,
  type RefObject,
} from 'react';
import {
  autoUpdate,
  flip,
  offset,
  type Placement,
  shift,
  size,
  useFloating,
} from '@floating-ui/react-dom';

const popupViewportPadding = 8;
const popupMinimumAvailableHeight = 96;

export const comboboxFloatingSizeVariables = {
  '--anchor-width': '0px',
  '--available-height': `${popupMinimumAvailableHeight}px`,
  '--available-width': `calc(100vw - ${popupViewportPadding * 2}px)`,
} as CSSProperties;

export function useComboboxFloatingPositioner({
  open,
  placement,
  sideOffset,
  triggerRef,
}: {
  open: boolean;
  placement: Placement;
  sideOffset: number;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const floatingMiddleware = useMemo(
    () => [
      offset(sideOffset),
      flip({ padding: popupViewportPadding }),
      shift({ padding: popupViewportPadding }),
      size({
        padding: popupViewportPadding,
        apply({ availableHeight, availableWidth, elements, rects }) {
          const availablePopupWidth = Math.max(0, availableWidth);
          const width = Math.min(rects.reference.width, availablePopupWidth);
          const availablePopupHeight = Math.max(
            popupMinimumAvailableHeight,
            availableHeight
          );

          elements.floating.style.setProperty('--anchor-width', `${width}px`);
          elements.floating.style.setProperty(
            '--available-width',
            `${availablePopupWidth}px`
          );
          elements.floating.style.setProperty(
            '--available-height',
            `${availablePopupHeight}px`
          );
        },
      }),
    ],
    [sideOffset]
  );
  const {
    floatingStyles,
    refs: { setFloating, setReference },
  } = useFloating<HTMLElement>({
    middleware: floatingMiddleware,
    open,
    placement,
    strategy: 'fixed',
    transform: false,
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    setReference(triggerRef.current);
  }, [setReference, triggerRef]);

  return {
    floatingStyles,
    setFloating,
  };
}
