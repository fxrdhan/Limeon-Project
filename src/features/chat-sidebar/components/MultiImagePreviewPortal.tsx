import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { LayoutGroup, motion } from 'motion/react';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import {
  TbCornerUpLeft,
  TbCornerUpRightDouble,
  TbArrowUpRight,
  TbCopy,
  TbDownload,
  TbLink,
  TbX,
} from 'react-icons/tb';
import ProgressiveImagePreview from './ProgressiveImagePreview';

interface MultiImagePreviewPortalItem {
  id: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  fullPreviewUrl: string | null;
  previewName: string;
}

interface MultiImagePreviewPortalProps {
  isOpen: boolean;
  isVisible: boolean;
  previewItems: MultiImagePreviewPortalItem[];
  activePreviewId: string | null;
  isActivePreviewForwardable: boolean;
  onSelectPreview: (messageId: string) => void;
  onDownloadActivePreview: () => void;
  onOpenActivePreviewInNewTab: () => void;
  onCopyActivePreviewLink: () => void;
  onCopyActivePreviewImage: () => void;
  onReplyActivePreview: () => void;
  onForwardActivePreview: () => void;
  onClose: () => void;
  backdropClassName: string;
}

const THUMBNAIL_GRID_GAP = 16;
const THUMBNAIL_GRID_HORIZONTAL_PADDING = 32;
const BASE_THUMBNAIL_TILE_SIZE = 116;
const THUMBNAIL_SCALE_STEP = 0.85;
const buildThumbnailTileSize = (columnCount: number) =>
  Math.round(
    BASE_THUMBNAIL_TILE_SIZE * THUMBNAIL_SCALE_STEP ** (columnCount - 1)
  );
const SIDEBAR_LAYOUT_LEVELS = [1, 2, 3, 4].map(columnCount => {
  const tileSize = buildThumbnailTileSize(columnCount);

  return {
    columnCount,
    tileSize,
    width:
      THUMBNAIL_GRID_HORIZONTAL_PADDING +
      tileSize * columnCount +
      THUMBNAIL_GRID_GAP * Math.max(0, columnCount - 1),
  };
});
const DEFAULT_SIDEBAR_WIDTH =
  SIDEBAR_LAYOUT_LEVELS.find(level => level.columnCount === 2)?.width ?? 280;
const ONE_COLUMN_SIDEBAR_WIDTH =
  SIDEBAR_LAYOUT_LEVELS.find(level => level.columnCount === 1)?.width ?? 148;
const FOUR_COLUMN_SIDEBAR_WIDTH =
  SIDEBAR_LAYOUT_LEVELS.find(level => level.columnCount === 4)?.width ?? 544;
const MIN_SIDEBAR_WIDTH = ONE_COLUMN_SIDEBAR_WIDTH;
const MAX_SIDEBAR_WIDTH = FOUR_COLUMN_SIDEBAR_WIDTH;
const MIN_PREVIEW_PANE_WIDTH = 360;
const THUMBNAIL_LAYOUT_TRANSITION = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.85,
};

const MultiImagePreviewPortal = ({
  isOpen,
  isVisible,
  previewItems,
  activePreviewId,
  isActivePreviewForwardable,
  onSelectPreview,
  onDownloadActivePreview,
  onOpenActivePreviewInNewTab,
  onCopyActivePreviewLink,
  onCopyActivePreviewImage,
  onReplyActivePreview,
  onForwardActivePreview,
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
  const activeBackdropUrl =
    activePreview?.fullPreviewUrl || activePreview?.previewUrl || null;
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

  const getSnappedSidebarWidth = useCallback(
    (nextWidth: number, availableWidth: number) => {
      const boundedWidth = clampSidebarWidth(nextWidth, availableWidth);
      const maxSidebarWidth = getMaxSidebarWidth(availableWidth);
      const snapCandidates = SIDEBAR_LAYOUT_LEVELS.map(
        level => level.width
      ).filter(width => width <= maxSidebarWidth);

      return snapCandidates.reduce(
        (closestWidth, candidateWidth) => {
          return Math.abs(candidateWidth - boundedWidth) <
            Math.abs(closestWidth - boundedWidth)
            ? candidateWidth
            : closestWidth;
        },
        Math.min(maxSidebarWidth, snapCandidates[0] ?? boundedWidth)
      );
    },
    [clampSidebarWidth, getMaxSidebarWidth]
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
      const snappedWidth = getSnappedSidebarWidth(currentWidth, containerWidth);
      return snappedWidth === currentWidth ? currentWidth : snappedWidth;
    });
  }, [containerWidth, getSnappedSidebarWidth]);

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

      const boundedWidth = getSnappedSidebarWidth(sidebarWidth, containerWidth);

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
    [containerWidth, getSnappedSidebarWidth, sidebarWidth]
  );

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) {
        return;
      }

      const widthDelta = event.clientX - resizeState.startX;
      setSidebarWidth(
        getSnappedSidebarWidth(
          resizeState.startWidth + widthDelta,
          containerWidth
        )
      );
    },
    [containerWidth, getSnappedSidebarWidth]
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
      setSidebarWidth(currentWidth => {
        const maxSidebarWidth = getMaxSidebarWidth(containerWidth);
        const snapCandidates = SIDEBAR_LAYOUT_LEVELS.map(
          level => level.width
        ).filter(width => width <= maxSidebarWidth);
        const activeIndex = snapCandidates.findIndex(
          width => width === currentWidth
        );
        const currentIndex = activeIndex === -1 ? 0 : activeIndex;
        const nextIndex =
          event.key === 'ArrowLeft'
            ? Math.max(0, currentIndex - 1)
            : Math.min(snapCandidates.length - 1, currentIndex + 1);

        return (
          snapCandidates[nextIndex] ?? Math.min(maxSidebarWidth, currentWidth)
        );
      });
    },
    [containerWidth, getMaxSidebarWidth]
  );

  const boundedSidebarWidth = getSnappedSidebarWidth(
    sidebarWidth,
    containerWidth
  );
  const maxSidebarWidth = getMaxSidebarWidth(containerWidth);
  const activeLayoutLevel =
    SIDEBAR_LAYOUT_LEVELS.find(level => level.width === boundedSidebarWidth) ??
    SIDEBAR_LAYOUT_LEVELS[0];
  const sidebarColumnCount = activeLayoutLevel.columnCount;
  const containerStyle = {
    '--multi-image-preview-sidebar-width': `${boundedSidebarWidth}px`,
  } as CSSProperties;

  return (
    <ImageExpandPreview
      isOpen={isOpen}
      isVisible={isVisible}
      onClose={onClose}
      animateScale={false}
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
          className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white md:flex-row"
        >
          <aside className="flex w-full shrink-0 border-b border-slate-300 bg-white md:w-[var(--multi-image-preview-sidebar-width)] md:border-b-0">
            <LayoutGroup id="multi-image-preview-thumbnails">
              <div
                className="grid max-h-full flex-1 content-start gap-4 overflow-y-auto p-4"
                style={{
                  gridTemplateColumns: `repeat(${sidebarColumnCount}, ${activeLayoutLevel.tileSize}px)`,
                  gridAutoRows: `${activeLayoutLevel.tileSize}px`,
                  scrollbarGutter: 'stable',
                }}
              >
                {previewItems.map((previewItem, index) => {
                  const isActive = previewItem.id === activePreview.id;

                  return (
                    <motion.button
                      key={previewItem.id}
                      layout
                      transition={THUMBNAIL_LAYOUT_TRANSITION}
                      type="button"
                      onClick={() => onSelectPreview(previewItem.id)}
                      aria-label={`Pilih gambar ${index + 1}`}
                      aria-pressed={isActive}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-200 ${
                        isActive
                          ? 'border-primary'
                          : 'border-slate-300 hover:border-slate-400'
                      } h-full w-full`}
                    >
                      {previewItem.fullPreviewUrl || previewItem.previewUrl ? (
                        <img
                          src={
                            previewItem.fullPreviewUrl ||
                            previewItem.previewUrl ||
                            ''
                          }
                          alt={`Thumbnail ${previewItem.previewName}`}
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="h-full w-full bg-slate-100"
                          aria-hidden="true"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </LayoutGroup>
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
                className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-black"
                title={`${activePreviewIndex + 1}/${previewItems.length} | ${activePreview.previewName}`}
              >
                <span className="shrink-0">
                  {activePreviewIndex + 1}/{previewItems.length}
                </span>
                <span className="shrink-0 text-slate-400">|</span>
                <span className="truncate">{activePreview.previewName}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenActivePreviewInNewTab}
                  aria-label="Buka di tab baru"
                  title="Buka di tab baru"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
                >
                  <TbArrowUpRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onCopyActivePreviewLink}
                  aria-label="Salin link"
                  title="Salin link"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
                >
                  <TbLink className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onCopyActivePreviewImage}
                  aria-label="Salin gambar"
                  title="Salin gambar"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
                >
                  <TbCopy className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReplyActivePreview();
                    onClose();
                  }}
                  aria-label="Balas gambar"
                  title="Balas gambar"
                  disabled={!isActivePreviewForwardable}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-black transition-colors ${
                    isActivePreviewForwardable
                      ? 'cursor-pointer hover:bg-slate-100'
                      : 'cursor-default opacity-40'
                  }`}
                >
                  <TbCornerUpLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onForwardActivePreview}
                  aria-label="Teruskan gambar"
                  title="Teruskan gambar"
                  disabled={!isActivePreviewForwardable}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-black transition-colors ${
                    isActivePreviewForwardable
                      ? 'cursor-pointer hover:bg-slate-100'
                      : 'cursor-default opacity-40'
                  }`}
                >
                  <TbCornerUpRightDouble className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onDownloadActivePreview}
                  aria-label="Unduh gambar"
                  title="Unduh gambar"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
                >
                  <TbDownload className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup preview gambar"
                  title="Tutup preview gambar"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
                >
                  <TbX className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-white p-4 md:p-6">
              <ProgressiveImagePreview
                fullSrc={activePreview.fullPreviewUrl}
                frameSourceSrc={activePreview.fullPreviewUrl}
                backdropSrc={activeBackdropUrl}
                alt={activePreview.previewName || 'Preview gambar'}
                className="h-full w-full"
                imageClassName="h-full w-full"
              />
            </div>
          </section>
        </div>
      ) : null}
    </ImageExpandPreview>
  );
};

export default MultiImagePreviewPortal;
