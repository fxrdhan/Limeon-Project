import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import {
  TbArrowUp,
  TbFileDescription,
  TbMusic,
  TbPhoto,
  TbPlus,
} from 'react-icons/tb';
import ImageUploader from '@/components/image-manager';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
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
import type {
  ComposerHoverableAttachmentCandidate,
  ComposerPanelModel,
} from '../models';
import {
  buildComposerLinkOverlaySegments,
  getComposerLinkSelectionOffset,
  type ComposerLinkOverlaySegment,
} from '../utils/composerLinkOverlay';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import ComposerAttachmentPreviewList from './composer/ComposerAttachmentPreviewList';
import ComposerEditBanner from './composer/ComposerEditBanner';
import { ComposerLinkPromptPopover } from './composer/ComposerLinkPromptPopover';

const ATTACHMENT_LINK_PROMPT_MIN_WIDTH = 156;
const ATTACHMENT_LINK_PROMPT_EDGE_MARGIN = 16;
const CHAT_POPOVER_ICON_CLASS_NAME =
  '[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black';

const ComposerPanelContent = ({ model }: { model: ComposerPanelModel }) => {
  const { state, attachments, documentPreview, refs, actions } = model;
  const attachmentPromptCloseTimerRef = useRef<number | null>(null);
  const [attachmentPromptPosition, setAttachmentPromptPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const composerLinkOverlaySegments = buildComposerLinkOverlaySegments({
    candidates: attachments.linkPrompt.hoverableCandidates,
    message: state.message,
  });
  const shouldRenderComposerLinkOverlay =
    composerLinkOverlaySegments.length > 0;

  const clearAttachmentPromptCloseTimer = useCallback(() => {
    if (attachmentPromptCloseTimerRef.current === null) return;

    window.clearTimeout(attachmentPromptCloseTimerRef.current);
    attachmentPromptCloseTimerRef.current = null;
  }, []);

  const scheduleAttachmentPromptClose = useCallback(() => {
    clearAttachmentPromptCloseTimer();
    attachmentPromptCloseTimerRef.current = window.setTimeout(() => {
      actions.onDismissAttachmentPastePrompt();
      setAttachmentPromptPosition(null);
      attachmentPromptCloseTimerRef.current = null;
    }, 90);
  }, [actions, clearAttachmentPromptCloseTimer]);

  const updateAttachmentPromptPosition = useCallback(
    (anchorElement: HTMLAnchorElement) => {
      const anchorRect = anchorElement.getBoundingClientRect();
      const minLeft =
        ATTACHMENT_LINK_PROMPT_EDGE_MARGIN +
        ATTACHMENT_LINK_PROMPT_MIN_WIDTH / 2;
      const maxLeft =
        window.innerWidth -
        ATTACHMENT_LINK_PROMPT_EDGE_MARGIN -
        ATTACHMENT_LINK_PROMPT_MIN_WIDTH / 2;
      const centeredLeft = anchorRect.left + anchorRect.width / 2;

      setAttachmentPromptPosition({
        top: Math.max(ATTACHMENT_LINK_PROMPT_EDGE_MARGIN, anchorRect.top),
        left: Math.min(maxLeft, Math.max(minLeft, centeredLeft)),
      });
    },
    []
  );

  const handleComposerAttachmentLinkClick = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      candidate: ComposerHoverableAttachmentCandidate
    ) => {
      event.preventDefault();
      if (event.detail !== 0) {
        return;
      }

      actions.onEditAttachmentLink(candidate);
    },
    [actions]
  );

  const handleComposerAttachmentLinkMouseDown = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      candidate: ComposerHoverableAttachmentCandidate
    ) => {
      event.preventDefault();

      const selectionOffset = getComposerLinkSelectionOffset(
        event.currentTarget,
        event.clientX,
        event.clientY
      );

      actions.onEditAttachmentLink(candidate, {
        selectionStart: candidate.rangeStart + selectionOffset,
        selectionEnd: candidate.rangeStart + selectionOffset,
      });
    },
    [actions]
  );

  const focusComposerSelection = useCallback(
    (selectionStart: number, selectionEnd = selectionStart) => {
      requestAnimationFrame(() => {
        const textarea = refs.messageInputRef.current;
        if (!textarea) return;

        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [refs.messageInputRef]
  );

  const handleComposerPlainLinkMouseDown = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      segment: ComposerLinkOverlaySegment
    ) => {
      if (segment.rangeStart === undefined) {
        return;
      }

      event.preventDefault();

      const selectionOffset = getComposerLinkSelectionOffset(
        event.currentTarget,
        event.clientX,
        event.clientY
      );

      focusComposerSelection(segment.rangeStart + selectionOffset);
    },
    [focusComposerSelection]
  );

  const handleComposerPlainLinkClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    },
    []
  );

  useEffect(() => {
    return () => {
      clearAttachmentPromptCloseTimer();
    };
  }, [clearAttachmentPromptCloseTimer]);

  useEffect(() => {
    if (attachments.linkPrompt.url) return;
    setAttachmentPromptPosition(null);
  }, [attachments.linkPrompt.url]);

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
            state.isSendSuccessGlowVisible
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
            state.isSendSuccessGlowVisible
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
              {state.editingMessagePreview ? (
                <ComposerEditBanner
                  editingMessagePreview={state.editingMessagePreview}
                  onCancelEditMessage={actions.onCancelEditMessage}
                  onFocusEditingTargetMessage={
                    actions.onFocusEditingTargetMessage
                  }
                  transition={contextualPanelTransition}
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false} mode="popLayout">
              {attachments.pendingComposerAttachments.length > 0 ? (
                <ComposerAttachmentPreviewList
                  attachments={attachments.pendingComposerAttachments}
                  openImageActionsAttachmentId={
                    attachments.openImageActionsAttachmentId
                  }
                  imageActionsButtonRef={refs.imageActionsButtonRef}
                  transition={contextualPanelTransition}
                  onToggleImageActionsMenu={actions.onToggleImageActionsMenu}
                  onCancelLoadingComposerAttachment={
                    actions.onCancelLoadingComposerAttachment
                  }
                  onRemovePendingComposerAttachment={
                    actions.onRemovePendingComposerAttachment
                  }
                />
              ) : null}
            </AnimatePresence>

            {typeof document !== 'undefined' &&
            attachments.openImageActionsAttachmentId &&
            attachments.imageActionsMenuPosition
              ? createPortal(
                  <PopupMenuPopover
                    isOpen
                    className="fixed z-[120] origin-top-right"
                    style={{
                      top: attachments.imageActionsMenuPosition.top,
                      left: attachments.imageActionsMenuPosition.left,
                    }}
                  >
                    <div
                      ref={refs.imageActionsMenuRef}
                      onClick={event => event.stopPropagation()}
                      role="presentation"
                    >
                      <PopupMenuContent
                        actions={attachments.imageActions}
                        minWidthClassName="min-w-[132px]"
                        enableArrowNavigation
                        autoFocusFirstItem
                        iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
                      />
                    </div>
                  </PopupMenuPopover>,
                  document.body
                )
              : null}

            {typeof document !== 'undefined' &&
            attachments.openImageActionsAttachmentId &&
            attachments.pdfCompressionMenuPosition &&
            attachments.pdfCompressionLevelActions.length > 0
              ? createPortal(
                  <PopupMenuPopover
                    isOpen
                    className="fixed z-[121] origin-top-right"
                    style={{
                      top: attachments.pdfCompressionMenuPosition.top,
                      left: attachments.pdfCompressionMenuPosition.left,
                    }}
                  >
                    <div
                      ref={refs.pdfCompressionMenuRef}
                      onClick={event => event.stopPropagation()}
                      role="presentation"
                    >
                      <PopupMenuContent
                        actions={attachments.pdfCompressionLevelActions}
                        minWidthClassName="min-w-[168px]"
                        enableArrowNavigation
                        initialPreselectedIndex={1}
                        iconClassName={CHAT_POPOVER_ICON_CLASS_NAME}
                      />
                    </div>
                  </PopupMenuPopover>,
                  document.body
                )
              : null}

            <ComposerLinkPromptPopover
              isOpen={Boolean(
                attachments.linkPrompt.url && attachmentPromptPosition
              )}
              position={attachmentPromptPosition}
              isAttachmentCandidate={
                attachments.linkPrompt.isAttachmentCandidate
              }
              isShortenable={attachments.linkPrompt.isShortenable}
              promptRef={refs.attachmentPastePromptRef}
              onCopyLink={actions.onCopyAttachmentPastePromptLink}
              onMouseEnter={clearAttachmentPromptCloseTimer}
              onMouseLeave={scheduleAttachmentPromptClose}
              onOpenLink={actions.onOpenAttachmentPastePromptLink}
              onShortenLink={actions.onShortenAttachmentPastePromptLink}
              onUseAsAttachment={actions.onUseAttachmentPasteAsAttachment}
              onUseAsUrl={actions.onUseAttachmentPasteAsUrl}
            />

            <motion.div
              layout
              transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
              className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
                state.isMessageInputMultiline
                  ? 'grid-rows-[auto_auto] gap-y-1 items-end'
                  : 'grid-rows-[auto] gap-y-0 items-center'
              }`}
            >
              <motion.div
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                className={`relative min-w-0 ${
                  state.isMessageInputMultiline
                    ? 'col-span-3 row-start-1 self-start'
                    : 'col-start-2 row-start-1 self-center'
                }`}
              >
                {shouldRenderComposerLinkOverlay ? (
                  <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-[22px] text-slate-900">
                    {composerLinkOverlaySegments.map(segment =>
                      segment.href ? (
                        <a
                          key={segment.key}
                          href={segment.href}
                          className="pointer-events-auto cursor-text text-slate-900 underline-offset-2 transition-colors hover:text-sky-700 hover:underline"
                          onMouseDown={event =>
                            segment.candidate
                              ? handleComposerAttachmentLinkMouseDown(
                                  event,
                                  segment.candidate
                                )
                              : handleComposerPlainLinkMouseDown(event, segment)
                          }
                          onClick={event =>
                            segment.candidate
                              ? handleComposerAttachmentLinkClick(
                                  event,
                                  segment.candidate
                                )
                              : handleComposerPlainLinkClick(event)
                          }
                          onMouseEnter={
                            segment.candidate
                              ? event => {
                                  clearAttachmentPromptCloseTimer();
                                  updateAttachmentPromptPosition(
                                    event.currentTarget
                                  );
                                  actions.onOpenAttachmentPastePrompt(
                                    segment.candidate!
                                  );
                                }
                              : event => {
                                  clearAttachmentPromptCloseTimer();
                                  updateAttachmentPromptPosition(
                                    event.currentTarget
                                  );
                                  actions.onOpenComposerLinkPrompt({
                                    url: segment.href!,
                                    pastedText: segment.text,
                                    rangeStart: segment.rangeStart!,
                                    rangeEnd: segment.rangeEnd!,
                                  });
                                }
                          }
                          onMouseLeave={scheduleAttachmentPromptClose}
                        >
                          {segment.text}
                        </a>
                      ) : (
                        <span key={segment.key}>{segment.text}</span>
                      )
                    )}
                  </div>
                ) : null}
                <motion.textarea
                  layout="position"
                  transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                  ref={refs.messageInputRef}
                  value={state.message}
                  onChange={event =>
                    actions.onMessageChange(event.target.value)
                  }
                  onKeyDown={actions.onKeyDown}
                  onPaste={actions.onPaste}
                  placeholder="Tulis pesan..."
                  rows={1}
                  style={{ height: `${state.messageInputHeight}px` }}
                  className={`w-full resize-none bg-transparent border-0 p-0 text-[15px] leading-[22px] placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    shouldRenderComposerLinkOverlay
                      ? 'relative z-0 text-transparent caret-slate-900'
                      : 'text-slate-900'
                  }`}
                />
              </motion.div>
              <motion.div
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                className={`relative justify-self-start shrink-0 ${
                  state.isMessageInputMultiline
                    ? 'col-start-1 row-start-2'
                    : 'col-start-1 row-start-1'
                }`}
              >
                <motion.button
                  type="button"
                  ref={refs.attachButtonRef}
                  onClick={actions.onAttachButtonClick}
                  aria-label="Lampirkan file"
                  aria-expanded={attachments.isAttachModalOpen}
                  aria-haspopup="dialog"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <motion.span
                    animate={{ rotate: attachments.isAttachModalOpen ? 45 : 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                  >
                    <TbPlus size={20} />
                  </motion.span>
                </motion.button>
                <AnimatePresence>
                  {attachments.isAttachModalOpen ? (
                    <div className="absolute bottom-[calc(100%+16px)] left-[-10px] z-20">
                      <motion.div
                        ref={refs.attachModalRef}
                        role="dialog"
                        aria-label="Lampirkan file"
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="inline-flex w-max flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
                      >
                        <button
                          type="button"
                          onClick={() => actions.onAttachImageClick()}
                          className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-1.5 py-1.5 text-sm text-black transition-colors hover:bg-slate-100"
                        >
                          <TbPhoto className="h-4 w-4 text-black" />
                          <span>Gambar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.onAttachDocumentClick()}
                          className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl py-1.5 pl-1.5 pr-3 text-sm text-black transition-colors hover:bg-slate-100"
                        >
                          <TbFileDescription className="h-4 w-4 text-black" />
                          <span>Dokumen</span>
                        </button>
                        <button
                          type="button"
                          onClick={actions.onAttachAudioClick}
                          className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-1.5 py-1.5 text-sm text-black transition-colors hover:bg-slate-100"
                        >
                          <TbMusic className="h-4 w-4 text-black" />
                          <span>Audio</span>
                        </button>
                      </motion.div>
                    </div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
              <motion.button
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                type="button"
                onClick={actions.onSendMessage}
                aria-label="Kirim pesan"
                disabled={state.isSendDisabled}
                className={`h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center justify-self-end whitespace-nowrap shrink-0 transition-opacity ${
                  state.isSendDisabled
                    ? 'cursor-not-allowed opacity-55'
                    : 'cursor-pointer'
                } ${
                  state.isMessageInputMultiline
                    ? 'col-start-3 row-start-2'
                    : 'col-start-3 row-start-1'
                }`}
              >
                <TbArrowUp size={20} className="text-white" />
              </motion.button>
              <input
                ref={refs.imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={actions.onImageFileChange}
              />
              <input
                ref={refs.documentInputRef}
                type="file"
                accept="*/*"
                multiple
                className="hidden"
                onChange={actions.onDocumentFileChange}
              />
              <input
                ref={refs.audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={actions.onAudioFileChange}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <ImageExpandPreview
        isOpen={Boolean(
          attachments.previewComposerImageAttachment &&
          attachments.isComposerImageExpanded
        )}
        isVisible={attachments.isComposerImageExpandedVisible}
        onClose={actions.onCloseComposerImagePreview}
        backdropClassName="z-[130] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            actions.onCloseComposerImagePreview();
          }
        }}
      >
        {attachments.previewComposerImageAttachment ? (
          <ImageUploader
            id="chat-composer-image-preview"
            shape="rounded"
            hasImage={true}
            onPopupClose={actions.onCloseComposerImagePreview}
            className="max-h-[92vh] max-w-[92vw]"
            popupTrigger="click"
            onImageUpload={async file => {
              actions.onCloseComposerImagePreview();
              actions.onQueueComposerImage(
                file,
                attachments.previewComposerImageAttachment!.id
              );
            }}
            onImageDelete={async () => {
              actions.onRemovePendingComposerAttachment(
                attachments.previewComposerImageAttachment!.id
              );
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={attachments.previewComposerImageAttachment.previewUrl ?? ''}
              alt={attachments.previewComposerImageAttachment.fileName}
              className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
              draggable={false}
            />
          </ImageUploader>
        ) : null}
      </ImageExpandPreview>

      <DocumentPreviewPortal
        isOpen={Boolean(documentPreview.composerDocumentPreviewUrl)}
        isVisible={documentPreview.isComposerDocumentPreviewVisible}
        previewUrl={documentPreview.composerDocumentPreviewUrl}
        previewName={documentPreview.composerDocumentPreviewName}
        onClose={actions.onCloseComposerDocumentPreview}
        backdropClassName="z-[130] px-4 py-6"
        iframeTitle="Preview dokumen composer"
      />
    </>
  );
};

const ComposerPanel = ({ model }: { model: ComposerPanelModel }) => (
  <ComposerPanelContent model={model} />
);

export default ComposerPanel;
