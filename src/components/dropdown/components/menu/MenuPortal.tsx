import { forwardRef, CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DropDirection } from '../../constants';

interface MenuPortalProps {
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  dropDirection: DropDirection;
  portalStyle: CSSProperties;
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
      onMouseEnter,
      onMouseLeave,
      children,
    },
    ref
  ) => {
    if (!isOpen && !isClosing) return null;

    return typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={ref}
            style={portalStyle}
            className={`
              ${dropDirection === 'down' ? 'origin-top' : 'origin-bottom'}
              bg-white rounded-xl border border-gray-200
              transition-all duration-300 ease-out transform
              ${
                isClosing
                  ? 'opacity-0 scale-y-0 translate-y-0'
                  : isOpen && applyOpenStyles
                    ? 'opacity-100 scale-y-100 translate-y-0'
                    : `opacity-0 scale-y-0 ${
                        dropDirection === 'down'
                          ? 'translate-y-2'
                          : '-translate-y-2'
                      } pointer-events-none`
              }
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
