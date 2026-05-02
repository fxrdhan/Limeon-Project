import { forwardRef, CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DropDirection } from '../../constants';

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
  isPositionReady: boolean;
  isKeyboardNavigation?: boolean;
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
      isPositionReady,
      isKeyboardNavigation = false,
      onMouseEnter,
      onMouseLeave,
      children,
    },
    ref
  ) => {
    // Always render portal when open or closing to ensure DOM element exists for positioning
    if (!isOpen && !isClosing) return null;
    const portalRole = role ?? 'dialog';

    return typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={ref}
            id={id}
            role={portalRole}
            aria-label={ariaLabel}
            style={portalStyle}
            data-combobox-popup=""
            data-state={isOpen && !isClosing ? 'open' : 'closed'}
            data-popup-open={isOpen && !isClosing ? '' : undefined}
            data-popup-side={dropDirection === 'down' ? 'bottom' : 'top'}
            className={`
              ${dropDirection === 'down' ? 'origin-top' : 'origin-bottom'}
              bg-white rounded-xl overflow-hidden
              shadow-thin-md
              transition-all duration-150 ease-out
              ${isClosing || !applyOpenStyles ? 'opacity-0 scale-95' : !isPositionReady ? 'opacity-0' : 'opacity-100 scale-100'}
              ${isFrozen ? 'pointer-events-none select-none' : ''}
              ${isKeyboardNavigation ? 'cursor-none' : ''}
          `}
            aria-hidden={isFrozen}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {children}
          </div>,
          document.body
        )
      : null;
  }
);

MenuPortal.displayName = 'MenuPortal';

export default MenuPortal;
