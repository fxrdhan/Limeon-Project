import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { motion, type HTMLMotionProps } from 'motion/react';
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

type ComboboxPopupProps = Omit<
  HTMLMotionProps<'div'>,
  'animate' | 'initial' | 'transition' | 'variants'
> & {
  initialFocus?: boolean;
};

const comboboxPopupCloseAnimationMs = 200;

const comboboxPopupVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const comboboxPopupTransition = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

const popupFocusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useComboboxOpenPresence(open: boolean) {
  const [present, setPresent] = useState(open);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (open) {
      setPresent(true);
      return;
    }

    if (!present) return;

    closeTimeoutRef.current = setTimeout(() => {
      setPresent(false);
      closeTimeoutRef.current = null;
    }, comboboxPopupCloseAnimationMs);

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [open, present]);

  return present;
}

export function ComboboxPortal({
  children,
  container,
  containerRef,
}: ComboboxPortalProps) {
  const { open } = useComboboxStateContext<unknown>();
  const present = useComboboxOpenPresence(open);
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

  if (!present || typeof document === 'undefined') return null;

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
  const present = useComboboxOpenPresence(open);
  const { triggerRef } = useComboboxStaticContext();
  const { floatingStyles, setFloating } = useComboboxFloatingPositioner({
    open: present,
    placement,
    sideOffset,
    triggerRef,
  });

  if (!present) return null;

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
        pointerEvents: open ? undefined : 'none',
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
  style,
  ...props
}: ComboboxPopupProps) {
  const { open } = useComboboxStateContext<unknown>();
  const present = useComboboxOpenPresence(open);
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

  if (!present) return null;

  return (
    <motion.div
      {...props}
      data-combobox-popup=""
      data-state={open ? 'open' : 'closed'}
      aria-hidden={open ? undefined : true}
      ref={setPopupRef}
      initial="hidden"
      animate={open ? 'visible' : 'exit'}
      variants={comboboxPopupVariants}
      transition={comboboxPopupTransition}
      style={style}
    >
      {children}
    </motion.div>
  );
}
