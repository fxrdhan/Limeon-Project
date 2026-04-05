import { AnimatePresence, motion } from 'motion/react';
import ImageUploader from '@/components/image-manager';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { TbArrowUp } from 'react-icons/tb';
import {
  COMPOSER_BASE_BORDER_COLOR,
  COMPOSER_BASE_SHADOW,
  COMPOSER_GLOW_SHADOW_FADE,
  COMPOSER_GLOW_SHADOW_HIGH,
  COMPOSER_GLOW_SHADOW_LOW,
  COMPOSER_GLOW_SHADOW_MID,
  COMPOSER_GLOW_SHADOW_PEAK,
  COMPOSER_SYNC_LAYOUT_TRANSITION,
  SEND_SUCCESS_GLOW_DURATION,
} from '../constants';
import { useComposerLinkPromptPopover } from '../hooks/useComposerLinkPromptPopover';
import type { ChatSidebarRuntimeState } from '../hooks/useChatSidebarRuntimeState';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import ComposerAttachmentPreviewList from './composer/ComposerAttachmentPreviewList';
import { ComposerAttachmentActionMenus } from './composer/ComposerAttachmentActionMenus';
import { ComposerAttachmentMenu } from './composer/ComposerAttachmentMenu';
import ComposerEditBanner from './composer/ComposerEditBanner';
import { ComposerMessageField } from './composer/ComposerMessageField';

type ComposerPanelRuntime = Pick<
  ChatSidebarRuntimeState,
  'composer' | 'previews' | 'mutations' | 'refs' | 'viewport'
>;

interface ComposerPanelProps {
  runtime: ComposerPanelRuntime;
}

const ComposerPanel = ({ runtime }: ComposerPanelProps) => {
  const { composer, previews, mutations, refs, viewport } = runtime;
  const linkPromptPopover = useComposerLinkPromptPopover({
    linkPromptUrl: composer.attachmentPastePromptUrl,
    onDismissAttachmentPastePrompt: composer.dismissAttachmentPastePrompt,
  });
  const contextualPanelTransition = {
    duration: COMPOSER_SYNC_LAYOUT_TRANSITION.duration,
    ease: COMPOSER_SYNC_LAYOUT_TRANSITION.ease,
    layout: COMPOSER_SYNC_LAYOUT_TRANSITION,
  } as const;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-12"
        style={{
          background:
            'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.72) 46%, rgba(255,255,255,0) 100%)',
        }}
      />

      <div
        ref={refs.composerContainerRef}
        className="absolute bottom-2 left-0 right-0 px-3 pb-4"
      >
        <motion.div
          layout
          initial={false}
          animate={
            composer.isSendSuccessGlowVisible
              ? {
                  borderColor: [
                    COMPOSER_BASE_BORDER_COLOR,
                    'oklch(50.8% 0.118 165.612 / 0.55)',
                    'oklch(50.8% 0.118 165.612 / 0.48)',
                    'oklch(50.8% 0.118 165.612 / 0.42)',
                    'oklch(50.8% 0.118 165.612 / 0.32)',
                    'oklch(50.8% 0.118 165.612 / 0.22)',
                    COMPOSER_BASE_BORDER_COLOR,
                  ],
                  boxShadow: [
                    COMPOSER_BASE_SHADOW,
                    COMPOSER_GLOW_SHADOW_PEAK,
                    COMPOSER_GLOW_SHADOW_HIGH,
                    COMPOSER_GLOW_SHADOW_MID,
                    COMPOSER_GLOW_SHADOW_FADE,
                    COMPOSER_GLOW_SHADOW_LOW,
                    COMPOSER_BASE_SHADOW,
                  ],
                }
              : {
                  borderColor: COMPOSER_BASE_BORDER_COLOR,
                  boxShadow: COMPOSER_BASE_SHADOW,
                }
          }
          transition={
            composer.isSendSuccessGlowVisible
              ? {
                  layout: COMPOSER_SYNC_LAYOUT_TRANSITION,
                  duration: SEND_SUCCESS_GLOW_DURATION / 1000,
                  times: [0, 0.12, 0.3, 0.48, 0.66, 0.82, 1],
                  ease: 'easeOut',
                }
              : {
                  layout: COMPOSER_SYNC_LAYOUT_TRANSITION,
                  duration: 0.12,
                  ease: 'easeOut',
                }
          }
          className="relative z-10 rounded-2xl border bg-white"
        >
          <motion.div
            layout
            transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
            className="relative z-10 rounded-[15px] bg-white px-2.5 py-2.5 transition-[height,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {composer.editingMessagePreview ? (
                <ComposerEditBanner
                  editingMessagePreview={composer.editingMessagePreview}
                  onCancelEditMessage={mutations.handleCancelEditMessage}
                  onFocusEditingTargetMessage={
                    viewport.focusEditingTargetMessage
                  }
                  transition={contextualPanelTransition}
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false} mode="popLayout">
              {composer.composerAttachmentPreviewItems.length > 0 ? (
                <ComposerAttachmentPreviewList
                  attachments={composer.composerAttachmentPreviewItems}
                  openImageActionsAttachmentId={
                    previews.openImageActionsAttachmentId
                  }
                  imageActionsButtonRef={previews.imageActionsButtonRef}
                  transition={contextualPanelTransition}
                  onToggleImageActionsMenu={
                    previews.handleToggleImageActionsMenu
                  }
                  onCancelLoadingComposerAttachment={
                    composer.cancelLoadingComposerAttachment
                  }
                  onRemovePendingComposerAttachment={
                    composer.removePendingComposerAttachment
                  }
                />
              ) : null}
            </AnimatePresence>

            <ComposerAttachmentActionMenus
              openImageActionsAttachmentId={
                previews.openImageActionsAttachmentId
              }
              imageActionsMenuPosition={previews.imageActionsMenuPosition}
              pdfCompressionMenuPosition={previews.pdfCompressionMenuPosition}
              imageActions={previews.imageActions}
              pdfCompressionLevelActions={previews.pdfCompressionLevelActions}
              imageActionsMenuRef={previews.imageActionsMenuRef}
              pdfCompressionMenuRef={previews.pdfCompressionMenuRef}
            />

            <motion.div
              layout
              transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
              className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
                composer.isMessageInputMultiline
                  ? 'grid-rows-[auto_auto] items-end gap-y-1'
                  : 'grid-rows-[auto] items-center gap-y-0'
              }`}
            >
              <ComposerMessageField
                message={composer.message}
                messageInputHeight={composer.messageInputHeight}
                isMessageInputMultiline={composer.isMessageInputMultiline}
                messageInputRef={refs.messageInputRef}
                attachmentPastePromptRef={composer.attachmentPastePromptRef}
                linkPrompt={{
                  url: composer.attachmentPastePromptUrl,
                  isAttachmentCandidate:
                    composer.isAttachmentPastePromptAttachmentCandidate,
                  isShortenable: composer.isAttachmentPastePromptShortenable,
                  hoverableCandidates: composer.hoverableAttachmentCandidates,
                }}
                attachmentPromptPosition={
                  linkPromptPopover.attachmentPromptPosition
                }
                onClearAttachmentPromptCloseTimer={
                  linkPromptPopover.clearAttachmentPromptCloseTimer
                }
                onScheduleAttachmentPromptClose={
                  linkPromptPopover.scheduleAttachmentPromptClose
                }
                onUpdateAttachmentPromptPosition={
                  linkPromptPopover.updateAttachmentPromptPosition
                }
                onMessageChange={composer.handleMessageChange}
                onKeyDown={mutations.handleKeyPress}
                onPaste={composer.handleComposerPaste}
                onOpenAttachmentPastePrompt={composer.openAttachmentPastePrompt}
                onOpenComposerLinkPrompt={composer.openComposerLinkPrompt}
                onEditAttachmentLink={composer.handleEditAttachmentLink}
                onOpenAttachmentPastePromptLink={
                  composer.handleOpenAttachmentPastePromptLink
                }
                onCopyAttachmentPastePromptLink={
                  composer.handleCopyAttachmentPastePromptLink
                }
                onShortenAttachmentPastePromptLink={
                  composer.handleShortenAttachmentPastePromptLink
                }
                onUseAttachmentPasteAsUrl={
                  composer.handleUseAttachmentPasteAsUrl
                }
                onUseAttachmentPasteAsAttachment={
                  composer.handleUseAttachmentPasteAsAttachment
                }
              />

              <ComposerAttachmentMenu
                isAttachModalOpen={composer.isAttachModalOpen}
                isMessageInputMultiline={composer.isMessageInputMultiline}
                attachButtonRef={composer.attachButtonRef}
                attachModalRef={composer.attachModalRef}
                imageInputRef={composer.imageInputRef}
                documentInputRef={composer.documentInputRef}
                audioInputRef={composer.audioInputRef}
                onAttachButtonClick={composer.handleAttachButtonClick}
                onAttachImageClick={composer.handleAttachImageClick}
                onAttachDocumentClick={composer.handleAttachDocumentClick}
                onAttachAudioClick={composer.handleAttachAudioClick}
                onImageFileChange={composer.handleImageFileChange}
                onDocumentFileChange={composer.handleDocumentFileChange}
                onAudioFileChange={composer.handleAudioFileChange}
              />

              <motion.button
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                type="button"
                onClick={mutations.handleSendMessage}
                aria-label="Kirim pesan"
                disabled={composer.isLoadingAttachmentComposerAttachments}
                className={`flex h-8 w-8 items-center justify-center justify-self-end rounded-xl bg-primary text-white whitespace-nowrap shrink-0 transition-opacity ${
                  composer.isLoadingAttachmentComposerAttachments
                    ? 'cursor-not-allowed opacity-55'
                    : 'cursor-pointer'
                } ${
                  composer.isMessageInputMultiline
                    ? 'col-start-3 row-start-2'
                    : 'col-start-3 row-start-1'
                }`}
              >
                <TbArrowUp size={20} className="text-white" />
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <ImageExpandPreview
        isOpen={Boolean(
          composer.previewComposerImageAttachment &&
          composer.isComposerImageExpanded
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
        {composer.previewComposerImageAttachment ? (
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
                composer.previewComposerImageAttachment!.id
              );
            }}
            onImageDelete={async () => {
              composer.removePendingComposerAttachment(
                composer.previewComposerImageAttachment!.id
              );
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={composer.previewComposerImageAttachment.previewUrl ?? ''}
              alt={composer.previewComposerImageAttachment.fileName}
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
