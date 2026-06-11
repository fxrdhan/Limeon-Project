import ImageExpandPreview from '@/components/shared/image-expand-preview';
import ProgressiveImagePreview from './ProgressiveImagePreview';
import { MultiImagePreviewHeader } from './multi-image-preview-portal/MultiImagePreviewHeader';
import { MultiImagePreviewResizeHandle } from './multi-image-preview-portal/MultiImagePreviewResizeHandle';
import { MultiImagePreviewSidebar } from './multi-image-preview-portal/MultiImagePreviewSidebar';
import type { MultiImagePreviewPortalItem } from './multi-image-preview-portal/types';
import { useMultiImagePreviewSidebarResize } from './multi-image-preview-portal/useMultiImagePreviewSidebarResize';

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
  const {
    activeLayoutLevel,
    boundedSidebarWidth,
    containerRef,
    containerStyle,
    handleResizeKeyDown,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    isResizingSidebar,
    maxSidebarWidth,
    resizeHandleRef,
    sidebarColumnCount,
  } = useMultiImagePreviewSidebarResize({
    isOpen,
    itemCount: previewItems.length,
  });

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
          <MultiImagePreviewSidebar
            activePreviewId={activePreview.id}
            activeTileSize={activeLayoutLevel.tileSize}
            onSelectPreview={onSelectPreview}
            previewItems={previewItems}
            sidebarColumnCount={sidebarColumnCount}
          />

          <MultiImagePreviewResizeHandle
            boundedSidebarWidth={boundedSidebarWidth}
            isResizingSidebar={isResizingSidebar}
            maxSidebarWidth={maxSidebarWidth}
            onKeyDown={handleResizeKeyDown}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            resizeHandleRef={resizeHandleRef}
          />

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <MultiImagePreviewHeader
              activePreviewIndex={activePreviewIndex}
              isActivePreviewForwardable={isActivePreviewForwardable}
              onClose={onClose}
              onCopyActivePreviewImage={onCopyActivePreviewImage}
              onCopyActivePreviewLink={onCopyActivePreviewLink}
              onDownloadActivePreview={onDownloadActivePreview}
              onForwardActivePreview={onForwardActivePreview}
              onOpenActivePreviewInNewTab={onOpenActivePreviewInNewTab}
              onReplyActivePreview={onReplyActivePreview}
              previewCount={previewItems.length}
              previewName={activePreview.previewName}
            />

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
