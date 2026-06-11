import { motion } from 'motion/react';
import { forwardRef, useEffect, useState } from 'react';
import { ComposerAttachmentLoadingPreview } from './attachment-preview-list/ComposerAttachmentLoadingPreview';
import { ComposerAttachmentPreviewRow } from './attachment-preview-list/ComposerAttachmentPreviewRow';
import type { ComposerAttachmentPreviewListProps } from './attachment-preview-list/types';
import { useComposerAttachmentPreviewScroll } from './attachment-preview-list/useComposerAttachmentPreviewScroll';

const ComposerAttachmentPreviewList = forwardRef<
  HTMLDivElement,
  ComposerAttachmentPreviewListProps
>(
  (
    {
      attachments,
      openImageActionsAttachmentId,
      isSelectionMode,
      selectedAttachmentIds,
      imageActionsButtonRef,
      transition,
      onToggleImageActionsMenu,
      onCloseImageActionsMenu,
      onMenuRepositionPauseChange,
      onToggleAttachmentSelection,
      onCancelLoadingComposerAttachment,
      onRemovePendingComposerAttachment,
      onScrollStateChange,
    },
    ref
  ) => {
    const [loadingDotCount, setLoadingDotCount] = useState(1);
    const hasPdfCompressionLoading = attachments.some(
      attachment =>
        'status' in attachment &&
        attachment.status === 'loading' &&
        attachment.loadingKind === 'pdf-compression'
    );
    const {
      handleAttachmentMenuIntent,
      scrollContainerRef,
      setAttachmentRowRef,
    } = useComposerAttachmentPreviewScroll({
      attachments,
      imageActionsButtonRef,
      isSelectionMode,
      onCloseImageActionsMenu,
      onMenuRepositionPauseChange,
      onScrollStateChange,
      onToggleImageActionsMenu,
      openImageActionsAttachmentId,
      selectedAttachmentIds,
    });

    useEffect(() => {
      if (!hasPdfCompressionLoading) {
        setLoadingDotCount(1);
        return;
      }

      const intervalId = window.setInterval(() => {
        setLoadingDotCount(currentCount => (currentCount % 3) + 1);
      }, 360);

      return () => {
        window.clearInterval(intervalId);
      };
    }, [hasPdfCompressionLoading]);

    const animatedDots = '.'.repeat(loadingDotCount);

    return (
      <motion.div
        ref={ref}
        key="composer-attachments-preview"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 2 }}
        transition={transition}
        className="h-full min-h-0 overflow-hidden"
      >
        <div
          ref={scrollContainerRef}
          className={`h-full min-h-0 overflow-y-auto pr-1 overscroll-contain [contain:paint] ${
            isSelectionMode ? 'pt-10 pb-9' : 'pb-2'
          }`}
        >
          {attachments.map(attachment => {
            if ('status' in attachment) {
              return (
                <ComposerAttachmentLoadingPreview
                  key={attachment.id}
                  animatedDots={animatedDots}
                  attachment={attachment}
                  onCancelLoadingComposerAttachment={
                    onCancelLoadingComposerAttachment
                  }
                />
              );
            }

            return (
              <ComposerAttachmentPreviewRow
                key={attachment.id}
                attachment={attachment}
                imageActionsButtonRef={imageActionsButtonRef}
                isMenuOpen={openImageActionsAttachmentId === attachment.id}
                isSelectedAttachment={selectedAttachmentIds.includes(
                  attachment.id
                )}
                isSelectionMode={isSelectionMode}
                onAttachmentMenuIntent={handleAttachmentMenuIntent}
                onRemovePendingComposerAttachment={
                  onRemovePendingComposerAttachment
                }
                onSetAttachmentRowRef={setAttachmentRowRef}
                onToggleAttachmentSelection={onToggleAttachmentSelection}
              />
            );
          })}
        </div>
      </motion.div>
    );
  }
);

ComposerAttachmentPreviewList.displayName = 'ComposerAttachmentPreviewList';

export default ComposerAttachmentPreviewList;
