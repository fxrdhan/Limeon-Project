import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import {
  useComboboxStateContext,
  useComboboxStaticContext,
} from './primitive-context';
import {
  comboboxFloatingSizeVariables,
  useComboboxFloatingPositioner,
} from './utils/primitive-positioning';

type ComboboxPortalProps = {
  children?: React.ReactNode;
  container?: Element | DocumentFragment | null;
  containerRef?: React.RefObject<Element | DocumentFragment | null>;
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

export function ComboboxPortal({
  children,
  container,
  containerRef,
}: ComboboxPortalProps) {
  const { open } = useComboboxStateContext<unknown>();
  const [resolvedRefContainer, setResolvedRefContainer] = useState<
    Element | DocumentFragment | null
  >(null);

  useLayoutEffect(() => {
    if (!open || container !== undefined || !containerRef) {
      setResolvedRefContainer(null);
      return;
    }

    const nextContainer = containerRef.current;
    setResolvedRefContainer(currentContainer =>
      currentContainer === nextContainer ? currentContainer : nextContainer
    );
  }, [container, containerRef, open]);

  if (!open || typeof document === 'undefined') return null;

  const portalContainer =
    container !== undefined
      ? container
      : containerRef
        ? (containerRef.current ?? resolvedRefContainer)
        : document.body;
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
  const { open } = useComboboxStateContext<unknown>();
  const { triggerRef } = useComboboxStaticContext();
  const { floatingStyles, setFloating } = useComboboxFloatingPositioner({
    open,
    placement,
    sideOffset,
    triggerRef,
  });

  if (!open) return null;

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
  const { open } = useComboboxStateContext<unknown>();
  const { popupRef } = useComboboxStaticContext();

  const setPopupRef = useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node;
    },
    [popupRef]
  );

  useEffect(() => {
    if (!open || !initialFocus) return;

    const focusTarget =
      popupRef.current?.querySelector<HTMLElement>(popupFocusableSelector) ??
      null;
    focusTarget?.focus({ preventScroll: true });
  }, [initialFocus, open, popupRef]);

  if (!open) return null;

  return (
    <div data-combobox-popup="" {...props} ref={setPopupRef}>
      {children}
    </div>
  );
}
