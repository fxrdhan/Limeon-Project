import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from './sidebarLayout';

interface MultiImagePreviewResizeHandleProps {
  boundedSidebarWidth: number;
  isResizingSidebar: boolean;
  maxSidebarWidth: number;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  resizeHandleRef: RefObject<HTMLButtonElement | null>;
}

export const MultiImagePreviewResizeHandle = ({
  boundedSidebarWidth,
  isResizingSidebar,
  maxSidebarWidth,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resizeHandleRef,
}: MultiImagePreviewResizeHandleProps) => (
  <button
    ref={resizeHandleRef}
    type="button"
    aria-label="Ubah lebar daftar gambar"
    aria-orientation="vertical"
    aria-valuemin={MIN_SIDEBAR_WIDTH}
    aria-valuemax={Math.min(MAX_SIDEBAR_WIDTH, maxSidebarWidth)}
    aria-valuenow={boundedSidebarWidth}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp}
    onKeyDown={onKeyDown}
    className="group relative hidden w-4 shrink-0 touch-none cursor-col-resize bg-white outline-hidden transition-colors md:flex"
    role="separator"
  >
    <span
      className={`pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
        isResizingSidebar
          ? 'bg-primary'
          : 'bg-slate-300 group-hover:bg-slate-400'
      }`}
    />
  </button>
);
