import { forwardRef, CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DropDirection } from '../../constants';

interface MenuPortalProps {
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
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
      isClosing,
      applyOpenStyles,
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

    return typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={ref}
            style={{
              ...portalStyle,
              ...(dropDirection === 'up' && {
                boxShadow:
                  '0 -20px 25px -5px rgba(0, 0, 0, 0.1), 0 -10px 10px -5px rgba(0, 0, 0, 0.04)',
              }),
            }}
            className={`
              ${dropDirection === 'down' ? 'origin-top' : 'origin-bottom'}
              bg-white rounded-xl border border-slate-200 overflow-hidden
              ${dropDirection === 'down' ? 'shadow-xl' : ''}
              transition-all duration-150 ease-out
              ${isClosing || !applyOpenStyles ? 'opacity-0 scale-95' : !isPositionReady ? 'opacity-0' : 'opacity-100 scale-100'}
              ${isKeyboardNavigation ? 'cursor-none' : ''}
          `}
            role="menu"
            onClick={e => e.stopPropagation()}
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
