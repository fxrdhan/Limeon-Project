import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { TbX } from 'react-icons/tb';

interface MultiImagePreviewPortalItem {
  id: string;
  previewUrl: string;
  previewName: string;
}

interface MultiImagePreviewPortalProps {
  isOpen: boolean;
  isVisible: boolean;
  previewItems: MultiImagePreviewPortalItem[];
  activePreviewId: string | null;
  onSelectPreview: (messageId: string) => void;
  onClose: () => void;
  backdropClassName: string;
}

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 420;
const MIN_PREVIEW_PANE_WIDTH = 360;
const MIN_SIDEBAR_WIDTH_FOR_THREE_COLUMNS = 300;
const MIN_SIDEBAR_WIDTH_FOR_FOUR_COLUMNS = 380;

const MultiImagePreviewPortal = ({
  isOpen,
  isVisible,
  previewItems,
  activePreviewId,
  onSelectPreview,
  onClose,
  backdropClassName,
}: MultiImagePreviewPortalProps) => {
  const activePreview =
    previewItems.find(previewItem => previewItem.id === activePreviewId) ||
    previewItems[0] ||
    null;
  const activePreviewIndex = activePreview
    ? previewItems.findIndex(previewItem => previewItem.id === activePreview.id)
    : -1;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeHandleRef = useRef<HTMLButtonElement | null>(null);
  const resizeStateRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(1180);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const getMaxSidebarWidth = useCallback((availableWidth: number) => {
    return Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, availableWidth - MIN_PREVIEW_PANE_WIDTH)
    );
  }, []);

  const clampSidebarWidth = useCallback(
    (nextWidth: number, availableWidth: number) => {
      const maxSidebarWidth = getMaxSidebarWidth(availableWidth);

      return Math.min(Math.max(nextWidth, MIN_SIDEBAR_WIDTH), maxSidebarWidth);
    },
    [getMaxSidebarWidth]
  );

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement || typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (!nextWidth) {
        return;
      }

      setContainerWidth(nextWidth);
    });

    setContainerWidth(containerElement.getBoundingClientRect().width);
    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    setSidebarWidth(currentWidth => {
      const boundedWidth = clampSidebarWidth(currentWidth, containerWidth);
      return boundedWidth === currentWidth ? currentWidth : boundedWidth;
    });
  }, [clampSidebarWidth, containerWidth]);

  const stopSidebarResize = useCallback(
    (target?: HTMLButtonElement | null, pointerId?: number) => {
      if (
        target &&
        pointerId !== undefined &&
        target.hasPointerCapture(pointerId)
      ) {
        target.releasePointerCapture(pointerId);
      }

      resizeStateRef.current = null;
      setIsResizingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      return;
    }

    stopSidebarResize(resizeHandleRef.current);
  }, [isOpen, stopSidebarResize]);

  useEffect(() => {
    const resizeHandleElement = resizeHandleRef.current;

    return () => {
      stopSidebarResize(resizeHandleElement);
    };
  }, [stopSidebarResize]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      const boundedWidth = clampSidebarWidth(sidebarWidth, containerWidth);

      event.preventDefault();
      resizeStateRef.current = {
        pointerId: event.pointerId,
        startWidth: boundedWidth,
        startX: event.clientX,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setSidebarWidth(boundedWidth);
      setIsResizingSidebar(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [clampSidebarWidth, containerWidth, sidebarWidth]
  );

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) {
        return;
      }

      const widthDelta = event.clientX - resizeState.startX;
      setSidebarWidth(
        clampSidebarWidth(resizeState.startWidth + widthDelta, containerWidth)
      );
    },
    [clampSidebarWidth, containerWidth]
  );

  const handleResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (resizeStateRef.current?.pointerId !== event.pointerId) {
        return;
      }

      stopSidebarResize(event.currentTarget, event.pointerId);
    },
    [stopSidebarResize]
  );

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      const nextDelta = event.key === 'ArrowLeft' ? -24 : 24;
      setSidebarWidth(currentWidth =>
        clampSidebarWidth(currentWidth + nextDelta, containerWidth)
      );
    },
    [clampSidebarWidth, containerWidth]
  );

  const boundedSidebarWidth = clampSidebarWidth(sidebarWidth, containerWidth);
  const maxSidebarWidth = getMaxSidebarWidth(containerWidth);
  const sidebarColumnCount =
    boundedSidebarWidth >= MIN_SIDEBAR_WIDTH_FOR_FOUR_COLUMNS
      ? 4
      : boundedSidebarWidth >= MIN_SIDEBAR_WIDTH_FOR_THREE_COLUMNS
        ? 3
        : 2;
  const containerStyle = {
    '--multi-image-preview-sidebar-width': `${boundedSidebarWidth}px`,
  } as CSSProperties;

  return (
    <ImageExpandPreview
      isOpen={isOpen}
      isVisible={isVisible}
      onClose={onClose}
      backdropClassName={backdropClassName}
      contentClassName="h-[92vh] w-[min(1180px,92vw)] max-w-[92vw] p-0"
      backdropRole="button"
      backdropTabIndex={0}
      backdropAriaLabel="Tutup preview gambar"
      onBackdropKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {activePreview ? (
        <div
          ref={containerRef}
          style={containerStyle}
          className="flex h-full w-full flex-col overflow-hidden rounded-[32px] border border-slate-300 bg-white md:flex-row"
        >
          <aside className="flex w-full shrink-0 border-b border-slate-300 bg-white md:w-[var(--multi-image-preview-sidebar-width)] md:border-b-0">
            <div
              className="grid max-h-full flex-1 content-start gap-4 overflow-y-auto p-4"
              style={{
                gridTemplateColumns: `repeat(${sidebarColumnCount}, minmax(0, 1fr))`,
              }}
            >
              {previewItems.map((previewItem, index) => {
                const isActive = previewItem.id === activePreview.id;

                return (
                  <button
                    key={previewItem.id}
                    type="button"
                    onClick={() => onSelectPreview(previewItem.id)}
                    aria-label={`Pilih gambar ${index + 1}`}
                    aria-pressed={isActive}
                    className={`group relative aspect-square overflow-hidden rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-primary'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={previewItem.previewUrl}
                      alt={`Thumbnail ${previewItem.previewName}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </aside>

          <button
            ref={resizeHandleRef}
            type="button"
            aria-label="Ubah lebar daftar gambar"
            aria-orientation="vertical"
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={maxSidebarWidth}
            aria-valuenow={boundedSidebarWidth}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            onKeyDown={handleResizeKeyDown}
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

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="flex h-14 items-center justify-between border-b border-slate-300 px-4">
              <p
                className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-slate-600"
                title={`${activePreviewIndex + 1}/${previewItems.length} | ${activePreview.previewName}`}
              >
                <span className="shrink-0">
                  {activePreviewIndex + 1}/{previewItems.length}
                </span>
                <span className="shrink-0 text-slate-400">|</span>
                <span className="truncate">{activePreview.previewName}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup preview gambar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <TbX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-white p-4 md:p-6">
              <img
                src={activePreview.previewUrl}
                alt={activePreview.previewName || 'Preview gambar'}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </div>
          </section>
        </div>
      ) : null}
    </ImageExpandPreview>
  );
};

export default MultiImagePreviewPortal;
