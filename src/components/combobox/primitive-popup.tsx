import { useCallback, useEffect } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { useComboboxContext } from './primitive-context';
import {
  comboboxFloatingSizeVariables,
  useComboboxFloatingPositioner,
} from './utils/primitive-positioning';

type ComboboxPortalProps = {
  children?: React.ReactNode;
  container?: Element | DocumentFragment | null;
};

type ComboboxPositionerProps = React.ComponentPropsWithoutRef<'div'> & {
  matchAnchorWidth?: boolean;
  placement?: Parameters<typeof useComboboxFloatingPositioner>[0]['placement'];
  sideOffset?: number;
};

type ComboboxPopupProps = React.ComponentPropsWithoutRef<'div'> & {
  initialFocus?: boolean;
};

const popupFocusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function ComboboxPortal({ children, container }: ComboboxPortalProps) {
  const context = useComboboxContext<unknown>();
  if (!context.open || typeof document === 'undefined') return null;

  const portalContainer = container === undefined ? document.body : container;
  if (!portalContainer) return null;

  return createPortal(children, portalContainer);
}

export function ComboboxPositioner({
  children,
  matchAnchorWidth = true,
  placement = 'bottom-start',
  sideOffset = 0,
  style,
  ...props
}: ComboboxPositionerProps) {
  const context = useComboboxContext<unknown>();
  const { floatingStyles, setFloating } = useComboboxFloatingPositioner({
    open: context.open,
    placement,
    sideOffset,
    triggerRef: context.triggerRef,
  });

  if (!context.open) return null;

  return (
    <div
      {...props}
      ref={setFloating}
      style={{
        ...comboboxFloatingSizeVariables,
        ...floatingStyles,
        maxHeight: 'var(--available-height)',
        maxWidth: 'var(--available-width)',
        minWidth: matchAnchorWidth ? undefined : 'var(--anchor-width)',
        overflow: 'visible',
        width: matchAnchorWidth ? 'var(--anchor-width)' : 'max-content',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ComboboxPopup({
  children,
  initialFocus = false,
  ...props
}: ComboboxPopupProps) {
  const context = useComboboxContext<unknown>();

  const setPopupRef = useCallback(
    (node: HTMLDivElement | null) => {
      context.popupRef.current = node;
    },
    [context.popupRef]
  );

  useEffect(() => {
    if (!context.open || !initialFocus) return;

    const focusTarget =
      context.popupRef.current?.querySelector<HTMLElement>(
        popupFocusableSelector
      ) ?? null;
    focusTarget?.focus({ preventScroll: true });
  }, [context.open, context.popupRef, initialFocus]);

  if (!context.open) return null;

  return (
    <div data-combobox-popup="" {...props} ref={setPopupRef}>
      {children}
    </div>
  );
}
