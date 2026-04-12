import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

const COMPOSER_ATTACHMENT_TOP_FOG_GRADIENT =
  'linear-gradient(to top, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 18%, rgba(255,255,255,0.72) 42%, rgba(255,255,255,0.96) 68%, rgba(255,255,255,1) 84%, rgba(255,255,255,1) 100%)';
const COMPOSER_ATTACHMENT_BOTTOM_FOG_GRADIENT =
  'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 18%, rgba(255,255,255,0.72) 42%, rgba(255,255,255,0.96) 68%, rgba(255,255,255,1) 84%, rgba(255,255,255,1) 100%)';

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
  const linkPromptPopover = useComposerLinkPromptPopover({
    linkPromptUrl: composer.attachmentPastePromptUrl,
    onDismissAttachmentPastePrompt: composer.dismissAttachmentPastePrompt,
  });
  const contextualPanelTransition = {
    duration: COMPOSER_SYNC_LAYOUT_TRANSITION.duration,
    ease: COMPOSER_SYNC_LAYOUT_TRANSITION.ease,
    layout: COMPOSER_SYNC_LAYOUT_TRANSITION,
  } as const;
  const hasComposerAttachmentTray =
    previews.isComposerAttachmentSelectionMode ||
    composer.composerAttachmentPreviewItems.length > 0;

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
  const handleComposerAttachmentScrollStateChange = (state: {
    hasOverflow: boolean;
    isAtTop: boolean;
    isAtBottom: boolean;
  }) => {
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
            'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.72) 46%, rgba(255,255,255,0) 100%)',
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-2 top-1/2 flex min-h-0 flex-col justify-end px-3 pb-4">
        <div
          ref={refs.composerContainerRef}
          className="pointer-events-none flex min-h-0 max-h-full flex-1 flex-col justify-end"
        >
          <div className="pointer-events-auto shrink-0">
            {hasComposerAttachmentTray ? (
              <motion.div
                layout
                initial={false}
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                className="relative mb-[-1px] grid min-h-0 shrink-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-3xl rounded-b-none border border-b-0 bg-white px-2.5 pt-2.5 pb-0"
                style={{
                  borderColor: COMPOSER_BASE_BORDER_COLOR,
                  maxHeight:
                    composerTrayMaxHeight && composerTrayMaxHeight > 0
                      ? composerTrayMaxHeight
                      : undefined,
                }}
              >
                <div className="relative min-h-0 overflow-hidden">
                  {composer.composerAttachmentPreviewItems.length > 0 ? (
                    <ComposerAttachmentPreviewList
                      attachments={composer.composerAttachmentPreviewItems}
                      openImageActionsAttachmentId={
                        previews.openImageActionsAttachmentId
                      }
                      isSelectionMode={
                        previews.isComposerAttachmentSelectionMode
                      }
                      selectedAttachmentIds={
                        previews.selectedComposerAttachmentIds
                      }
                      imageActionsButtonRef={previews.imageActionsButtonRef}
                      transition={contextualPanelTransition}
                      onToggleImageActionsMenu={
                        previews.handleToggleImageActionsMenu
                      }
                      onToggleAttachmentSelection={
                        previews.handleToggleComposerAttachmentSelection
                      }
                      onCancelLoadingComposerAttachment={
                        composer.cancelLoadingComposerAttachment
                      }
                      onRemovePendingComposerAttachment={
                        composer.removePendingComposerAttachment
                      }
                      onScrollStateChange={
                        handleComposerAttachmentScrollStateChange
                      }
                    />
                  ) : null}
                  {previews.isComposerAttachmentSelectionMode ? (
                    <motion.div
                      layout
                      transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                      data-testid="composer-attachment-selection-fog"
                      className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-14 text-sm"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -top-2.5 h-[calc(100%+0.625rem)]"
                        style={{
                          background: COMPOSER_ATTACHMENT_TOP_FOG_GRADIENT,
                        }}
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-1 pt-0.5">
                        <button
                          type="button"
                          onClick={previews.handleSelectAllComposerAttachments}
                          className="pointer-events-auto relative z-[1] cursor-pointer bg-transparent p-0 text-sm font-medium text-black hover:underline hover:underline-offset-2"
                        >
                          Pilih semua
                        </button>
                        <p className="relative z-[1] text-sm font-medium text-slate-500">
                          {previews.selectedComposerAttachmentIds.length}/
                          {totalSelectableComposerAttachments} terpilih
                        </p>
                      </div>
                    </motion.div>
                  ) : shouldShowComposerAttachmentTopFog ? (
                    <motion.div
                      layout
                      transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                      data-testid="composer-attachment-top-fog"
                      className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-14 text-sm"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -top-2.5 h-[calc(100%+0.625rem)]"
                        style={{
                          background: COMPOSER_ATTACHMENT_TOP_FOG_GRADIENT,
                        }}
                      />
                    </motion.div>
                  ) : null}
                </div>

                {shouldShowComposerAttachmentFog ? (
                  <motion.div
                    layout
                    transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                    data-testid="composer-attachment-fog"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-14 text-sm"
                  >
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 bottom-0 ${
                        isComposerAttachmentTrayScrolledToBottom
                          ? 'h-7'
                          : 'h-full'
                      }`}
                      style={{
                        background: isComposerAttachmentTrayScrolledToBottom
                          ? 'rgb(255,255,255)'
                          : COMPOSER_ATTACHMENT_BOTTOM_FOG_GRADIENT,
                      }}
                    />
                    {previews.isComposerAttachmentSelectionMode ? (
                      <div className="absolute inset-x-0 bottom-px flex items-end justify-between px-3">
                        <button
                          type="button"
                          onClick={
                            previews.handleClearComposerAttachmentSelection
                          }
                          className="pointer-events-auto relative z-[1] cursor-pointer bg-transparent p-0 text-sm leading-tight font-medium text-black hover:underline hover:underline-offset-2"
                        >
                          Batal
                        </button>
                        {previews.selectedComposerAttachmentIds.length > 0 ? (
                          <button
                            type="button"
                            onClick={
                              previews.handleDeleteSelectedComposerAttachments
                            }
                            className="pointer-events-auto relative z-[1] cursor-pointer bg-transparent p-0 text-sm leading-tight font-medium text-rose-600 hover:underline hover:underline-offset-2"
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                ) : (
                  <div />
                )}
              </motion.div>
            ) : null}

            <motion.div
              ref={composerBarRef}
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
                      boxShadow: hasComposerAttachmentTray
                        ? 'none'
                        : [
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
                      boxShadow: hasComposerAttachmentTray
                        ? 'none'
                        : COMPOSER_BASE_SHADOW,
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
              className={`relative z-10 shrink-0 border bg-white ${
                hasComposerAttachmentTray
                  ? 'rounded-t-none rounded-b-3xl border-t-0'
                  : 'rounded-3xl'
              }`}
            >
              <motion.div
                layout
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                className={`relative z-10 bg-white px-2.5 py-2.5 transition-[height,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  hasComposerAttachmentTray
                    ? 'rounded-t-none rounded-b-[18px]'
                    : 'rounded-[18px]'
                }`}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {composer.editingMessagePreview ? (
                    <ComposerEditBanner
                      messagePreview={composer.editingMessagePreview}
                      mode="edit"
                      onCancelContext={mutations.handleCancelEditMessage}
                      onFocusTargetMessage={viewport.focusEditingTargetMessage}
                      transition={contextualPanelTransition}
                    />
                  ) : composer.replyingMessagePreview ? (
                    <ComposerEditBanner
                      messagePreview={composer.replyingMessagePreview}
                      mode="reply"
                      onCancelContext={mutations.handleCancelReplyMessage}
                      onFocusTargetMessage={() => {
                        if (composer.replyingMessageId) {
                          viewport.focusReplyTargetMessage(
                            composer.replyingMessageId
                          );
                        }
                      }}
                      transition={contextualPanelTransition}
                    />
                  ) : null}
                </AnimatePresence>

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
                      isShortenable:
                        composer.isAttachmentPastePromptShortenable,
                      hoverableCandidates:
                        composer.hoverableAttachmentCandidates,
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
                    onOpenAttachmentPastePrompt={
                      composer.openAttachmentPastePrompt
                    }
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center justify-self-end rounded-xl bg-primary text-white whitespace-nowrap transition-opacity ${
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

          <ComposerAttachmentActionMenus
            openImageActionsAttachmentId={previews.openImageActionsAttachmentId}
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
              src={
                composer.composerImageExpandedUrl ??
                composer.previewComposerImageAttachment.previewUrl ??
                ''
              }
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
