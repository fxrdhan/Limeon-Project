import type React from 'react';
import { createPortal } from 'react-dom';
import PopupMenuContent from '../PopupMenuContent';
import type { ImageUploaderPopupOption } from './popupOptions';

interface ImageUploaderPopupPortalProps {
  coordinates: {
    x: number;
    y: number;
  };
  isClickTrigger: boolean;
  isVisible: boolean;
  onMouseEnter: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave: React.MouseEventHandler<HTMLDivElement>;
  options: ImageUploaderPopupOption[];
  popupPosition: 'left' | 'right';
  portalRef: React.RefObject<HTMLDivElement | null>;
}

const ImageUploaderPopupPortal: React.FC<ImageUploaderPopupPortalProps> = ({
  coordinates,
  isClickTrigger,
  isVisible,
  onMouseEnter,
  onMouseLeave,
  options,
  popupPosition,
  portalRef,
}) => {
  return createPortal(
    <div
      ref={portalRef}
      className="fixed z-[9999]"
      style={{
        left: coordinates.x,
        top: coordinates.y,
        transform: isClickTrigger ? 'none' : 'translateY(-50%)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`transition-all duration-150 ease-out ${
          isVisible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <PopupMenuContent
          actions={options.map(option => ({
            label: option.label,
            icon: option.icon,
            onClick: option.action,
            disabled: option.disabled,
            tone: option.label === 'Hapus' ? 'danger' : 'default',
          }))}
        />
        {!isClickTrigger &&
          (popupPosition === 'right' ? (
            <div className="absolute right-full top-1/2 -translate-y-1/2 transform">
              <div className="h-0 w-0 border-y-[6px] border-r-[6px] border-y-transparent border-r-slate-200"></div>
              <div className="absolute right-[-1px] top-1/2 h-0 w-0 -translate-y-1/2 transform border-y-[5px] border-r-[5px] border-y-transparent border-r-white"></div>
            </div>
          ) : (
            <div className="absolute left-full top-1/2 -translate-y-1/2 transform">
              <div className="h-0 w-0 border-y-[6px] border-l-[6px] border-y-transparent border-l-slate-200"></div>
              <div className="absolute left-[-1px] top-1/2 h-0 w-0 -translate-y-1/2 transform border-y-[5px] border-l-[5px] border-y-transparent border-l-white"></div>
            </div>
          ))}
      </div>
    </div>,
    document.body
  );
};

export default ImageUploaderPopupPortal;
