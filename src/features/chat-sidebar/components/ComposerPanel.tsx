import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ImageUploader from '@/components/image-manager';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import { ComposerAttachmentActionMenus } from './composer/ComposerAttachmentActionMenus';
import { ComposerAttachmentTray } from './composer/ComposerAttachmentTray';
import { ComposerBar } from './composer/ComposerBar';
import type {
  ComposerAttachmentScrollState,
  ComposerPanelRuntime,
} from './composer/composerPanelTypes';

interface ComposerPanelProps {
  runtime: ComposerPanelRuntime;
}

const ComposerPanel = ({ runtime }: ComposerPanelProps) => {
  const { composer, previews, mutations, refs, viewport } = runtime;
  const composerBarRef = useRef<HTMLDivElement | null>(null);
  const [composerTrayMaxHeight, setComposerTrayMaxHeight] = useState<
    number | null
  >(null);
  const [
    isComposerAttachmentTrayScrolledToBottom,
    setIsComposerAttachmentTrayScrolledToBottom,
  ] = useState(false);
  const [
    isComposerAttachmentTrayScrolledToTop,
    setIsComposerAttachmentTrayScrolledToTop,
  ] = useState(true);
  const [
    hasComposerAttachmentTrayOverflow,
    setHasComposerAttachmentTrayOverflow,
  ] = useState(false);
  const totalSelectableComposerAttachments =
    composer.composerAttachmentPreviewItems.filter(
      attachment =>
        !('status' in attachment) &&
        (attachment.fileKind === 'image' || attachment.fileKind === 'document')
    ).length;
  const hasComposerAttachmentTray =
    previews.isComposerAttachmentSelectionMode ||
    composer.composerAttachmentPreviewItems.length > 0;
  const previewComposerImageAttachment =
    composer.previewComposerImageAttachment;

  useLayoutEffect(() => {
    if (!hasComposerAttachmentTray) {
      setComposerTrayMaxHeight(null);
      return;
    }

    const composerContainer = refs.composerContainerRef.current;
    const composerBar = composerBarRef.current;
    if (!composerContainer || !composerBar) {
      return;
    }

    const updateComposerTrayMaxHeight = () => {
      const nextMaxHeight = Math.max(
        Math.floor(
          composerContainer.getBoundingClientRect().height -
            composerBar.getBoundingClientRect().height
        ),
        0
      );

      setComposerTrayMaxHeight(previousMaxHeight =>
        previousMaxHeight === nextMaxHeight ? previousMaxHeight : nextMaxHeight
      );
    };

    updateComposerTrayMaxHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateComposerTrayMaxHeight();
    });
    resizeObserver.observe(composerContainer);
    resizeObserver.observe(composerBar);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasComposerAttachmentTray, refs.composerContainerRef]);

  useEffect(() => {
    if (!hasComposerAttachmentTray) {
      setHasComposerAttachmentTrayOverflow(false);
      setIsComposerAttachmentTrayScrolledToTop(true);
      setIsComposerAttachmentTrayScrolledToBottom(false);
    }
  }, [hasComposerAttachmentTray]);

  const shouldShowComposerAttachmentTopFog =
    hasComposerAttachmentTrayOverflow && !isComposerAttachmentTrayScrolledToTop;
  const shouldShowComposerAttachmentFog =
    previews.isComposerAttachmentSelectionMode ||
    (hasComposerAttachmentTrayOverflow &&
      !isComposerAttachmentTrayScrolledToBottom);
  const handleComposerAttachmentScrollStateChange = (
    state: ComposerAttachmentScrollState
  ) => {
    setHasComposerAttachmentTrayOverflow(state.hasOverflow);
    setIsComposerAttachmentTrayScrolledToTop(state.isAtTop);
    setIsComposerAttachmentTrayScrolledToBottom(state.isAtBottom);
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-12"
        style={{
          background:
            'linear-gradient(to top, oklch(100% 0 0 / 0.98) 0%, oklch(100% 0 0 / 0.72) 46%, oklch(100% 0 0 / 0) 100%)',
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-2 top-1/2 flex min-h-0 flex-col justify-end px-3 pb-4">
        <div
          ref={refs.composerContainerRef}
          className="pointer-events-none flex min-h-0 max-h-full flex-1 flex-col justify-end"
        >
          <div className="pointer-events-auto shrink-0">
            {hasComposerAttachmentTray ? (
              <ComposerAttachmentTray
                composer={composer}
                composerTrayMaxHeight={composerTrayMaxHeight}
                isComposerAttachmentTrayScrolledToBottom={
                  isComposerAttachmentTrayScrolledToBottom
                }
                onScrollStateChange={handleComposerAttachmentScrollStateChange}
                previews={previews}
                shouldShowComposerAttachmentFog={
                  shouldShowComposerAttachmentFog
                }
                shouldShowComposerAttachmentTopFog={
                  shouldShowComposerAttachmentTopFog
                }
                totalSelectableComposerAttachments={
                  totalSelectableComposerAttachments
                }
              />
            ) : null}

            <ComposerBar
              composer={composer}
              composerBarRef={composerBarRef}
              hasComposerAttachmentTray={hasComposerAttachmentTray}
              mutations={mutations}
              refs={refs}
              viewport={viewport}
            />
          </div>

          <ComposerAttachmentActionMenus
            openImageActionsAttachmentId={previews.openImageActionsAttachmentId}
            isMenuRepositionPaused={previews.isAttachmentMenuRepositionPaused}
            imageActionsMenuPosition={previews.imageActionsMenuPosition}
            pdfCompressionMenuPosition={previews.pdfCompressionMenuPosition}
            imageActions={previews.imageActions}
            pdfCompressionLevelActions={previews.pdfCompressionLevelActions}
            imageActionsMenuRef={previews.imageActionsMenuRef}
            pdfCompressionMenuRef={previews.pdfCompressionMenuRef}
          />
        </div>
      </div>

      <ImageExpandPreview
        isOpen={Boolean(
          previewComposerImageAttachment && composer.isComposerImageExpanded
        )}
        isVisible={composer.isComposerImageExpandedVisible}
        onClose={composer.closeComposerImagePreview}
        backdropClassName="z-[130] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            composer.closeComposerImagePreview();
          }
        }}
      >
        {previewComposerImageAttachment ? (
          <ImageUploader
            id="chat-composer-image-preview"
            shape="square"
            hasImage={true}
            onPopupClose={composer.closeComposerImagePreview}
            className="max-h-[92vh] max-w-[92vw]"
            popupTrigger="click"
            onImageUpload={async file => {
              composer.closeComposerImagePreview();
              composer.queueComposerImage(
                file,
                previewComposerImageAttachment.id
              );
            }}
            onImageDelete={async () => {
              composer.removePendingComposerAttachment(
                previewComposerImageAttachment.id
              );
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={
                composer.composerImageExpandedUrl ??
                previewComposerImageAttachment.previewUrl ??
                ''
              }
              alt={previewComposerImageAttachment.fileName}
              className="max-h-[92vh] max-w-[92vw] object-contain shadow-xl"
              draggable={false}
            />
          </ImageUploader>
        ) : null}
      </ImageExpandPreview>

      <DocumentPreviewPortal
        isOpen={Boolean(previews.composerDocumentPreviewUrl)}
        isVisible={previews.isComposerDocumentPreviewVisible}
        previewUrl={previews.composerDocumentPreviewUrl}
        previewName={previews.composerDocumentPreviewName}
        onClose={previews.closeComposerDocumentPreview}
        backdropClassName="z-[130] px-4 py-6"
        iframeTitle="Preview dokumen composer"
      />
    </>
  );
};

export default ComposerPanel;
