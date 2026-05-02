import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { DropDirection } from '../../constants';
import { renderComboboxElement } from '../../utils/renderPart';
import type {
  ComboboxPopupRenderProps,
  ComboboxPopupState,
  ComboboxRenderProp,
} from '../../types';

interface MenuPortalProps {
  id: string;
  role?: 'dialog';
  ariaLabel: string;
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  isFrozen?: boolean;
  dropDirection: DropDirection;
  portalStyle: CSSProperties;
  style?: CSSProperties;
  isPositionReady: boolean;
  isKeyboardNavigation?: boolean;
  className?: string;
  render?: ComboboxRenderProp<
    ComboboxPopupRenderProps,
    ComboboxPopupState,
    'div'
  >;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: ReactNode;
}

const MenuPortal = forwardRef<HTMLDivElement, MenuPortalProps>(
  (
    {
      isOpen,
      id,
      role,
      ariaLabel,
      isClosing,
      applyOpenStyles,
      isFrozen = false,
      dropDirection,
      portalStyle,
      style,
      isPositionReady,
      isKeyboardNavigation = false,
      className,
      render,
      onMouseEnter,
      onMouseLeave,
      children,
    },
    ref
  ) => {
    // Always render portal when open or closing to ensure DOM element exists for positioning
    if (!isOpen && !isClosing) return null;

    if (typeof document === 'undefined') return null;

    const side: 'top' | 'bottom' = dropDirection === 'down' ? 'bottom' : 'top';
    const popupProps = {
      ref,
      id,
      role,
      'aria-label': role ? ariaLabel : undefined,
      style: { ...portalStyle, ...style },
      'data-combobox-popup': '',
      'data-state': isOpen && !isClosing ? 'open' : 'closed',
      'data-popup-open': isOpen && !isClosing ? '' : undefined,
      'data-popup-side': side,
      'data-frozen': isFrozen ? '' : undefined,
      className: `
              ${dropDirection === 'down' ? 'origin-top' : 'origin-bottom'}
              bg-white rounded-xl overflow-hidden
              shadow-thin-md
              transition-all duration-150 ease-out
              ${isClosing || !applyOpenStyles ? 'opacity-0 scale-95' : !isPositionReady ? 'opacity-0' : 'opacity-100 scale-100'}
              ${isFrozen ? 'pointer-events-none select-none' : ''}
              ${isKeyboardNavigation ? 'cursor-none' : ''}
              ${className ?? ''}
          `,
      'aria-hidden': isFrozen,
      onMouseEnter,
      onMouseLeave,
      children,
    } as ComboboxPopupRenderProps;
    const state = {
      open: isOpen && !isClosing,
      closed: !isOpen || isClosing,
      frozen: isFrozen,
      side,
    } satisfies ComboboxPopupState;
    const renderedElement = renderComboboxElement(render, popupProps, state);
    const { ref: _renderRef, ...popupDomProps } = popupProps;

    return createPortal(
      renderedElement ?? (
        <div
          ref={ref}
          {...(popupDomProps as ComponentPropsWithoutRef<'div'>)}
        />
      ),
      document.body
    );
  }
);

MenuPortal.displayName = 'MenuPortal';

export default MenuPortal;
