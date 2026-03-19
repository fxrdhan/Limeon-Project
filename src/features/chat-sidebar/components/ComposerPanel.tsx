import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useRef,
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
  ComposerHoverableEmbeddedLinkCandidate,
  ComposerPanelModel,
} from '../models';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import ComposerAttachmentPreviewList from './composer/ComposerAttachmentPreviewList';
import ComposerEditBanner from './composer/ComposerEditBanner';

interface ComposerLinkOverlaySegment {
  candidate: ComposerHoverableEmbeddedLinkCandidate | null;
  key: string;
  text: string;
}

const buildComposerLinkOverlaySegments = ({
  candidates,
  message,
}: {
  candidates: ComposerHoverableEmbeddedLinkCandidate[];
  message: string;
}) => {
  if (candidates.length === 0) {
    return [];
  }

  const sortedCandidates = [...candidates].sort(
    (leftCandidate, rightCandidate) =>
      leftCandidate.rangeStart - rightCandidate.rangeStart
  );
  const segments: ComposerLinkOverlaySegment[] = [];
  let currentIndex = 0;

  for (const candidate of sortedCandidates) {
    if (candidate.rangeStart > currentIndex) {
      segments.push({
        candidate: null,
        key: `text_${currentIndex}_${candidate.rangeStart}`,
        text: message.slice(currentIndex, candidate.rangeStart),
      });
    }

    segments.push({
      candidate,
      key: candidate.id,
      text: message.slice(candidate.rangeStart, candidate.rangeEnd),
    });
    currentIndex = candidate.rangeEnd;
  }

  if (currentIndex < message.length) {
    segments.push({
      candidate: null,
      key: `text_${currentIndex}_${message.length}`,
      text: message.slice(currentIndex),
    });
  }

  return segments;
};

const ComposerPanelContent = ({ model }: { model: ComposerPanelModel }) => {
  const { state, attachments, documentPreview, refs, actions } = model;
  const embeddedLinkPromptCloseTimerRef = useRef<number | null>(null);
  const shouldRenderComposerLinkOverlay =
    attachments.hoverableEmbeddedLinkCandidates.length > 0;
  const composerLinkOverlaySegments = buildComposerLinkOverlaySegments({
    candidates: attachments.hoverableEmbeddedLinkCandidates,
    message: state.message,
  });

  const clearEmbeddedLinkPromptCloseTimer = useCallback(() => {
    if (embeddedLinkPromptCloseTimerRef.current === null) return;

    window.clearTimeout(embeddedLinkPromptCloseTimerRef.current);
    embeddedLinkPromptCloseTimerRef.current = null;
  }, []);

  const scheduleEmbeddedLinkPromptClose = useCallback(() => {
    clearEmbeddedLinkPromptCloseTimer();
    embeddedLinkPromptCloseTimerRef.current = window.setTimeout(() => {
      actions.onDismissEmbeddedLinkPastePrompt();
      embeddedLinkPromptCloseTimerRef.current = null;
    }, 90);
  }, [actions, clearEmbeddedLinkPromptCloseTimer]);

  const handleComposerLinkClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      refs.messageInputRef.current?.focus();
    },
    [refs.messageInputRef]
  );

  useEffect(() => {
    return () => {
      clearEmbeddedLinkPromptCloseTimer();
    };
  }, [clearEmbeddedLinkPromptCloseTimer]);

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
                  onOpenComposerImagePreview={
                    actions.onOpenComposerImagePreview
                  }
                  onOpenDocumentAttachment={
                    actions.onOpenDocumentAttachmentInPortal
                  }
                  onToggleImageActionsMenu={actions.onToggleImageActionsMenu}
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
                      />
                    </div>
                  </PopupMenuPopover>,
                  document.body
                )
              : null}

            <AnimatePresence>
              {attachments.embeddedLinkPastePromptUrl ? (
                <PopupMenuPopover
                  isOpen
                  className="absolute bottom-[calc(100%+10px)] left-0 z-20"
                >
                  <div
                    ref={refs.embeddedLinkPastePromptRef}
                    className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
                    onClick={event => event.stopPropagation()}
                    onMouseEnter={clearEmbeddedLinkPromptCloseTimer}
                    onMouseLeave={scheduleEmbeddedLinkPromptClose}
                    role="dialog"
                    aria-label="Pilih cara menempel link"
                  >
                    <div className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                      Tempel sebagai
                    </div>
                    <button
                      type="button"
                      onClick={actions.onUseEmbeddedLinkPasteAsUrl}
                      className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={actions.onUseEmbeddedLinkPasteAsEmbed}
                      className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      Embed
                    </button>
                  </div>
                </PopupMenuPopover>
              ) : null}
            </AnimatePresence>

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
                      segment.candidate ? (
                        <a
                          key={segment.key}
                          href={segment.candidate.url}
                          className="pointer-events-auto cursor-pointer text-slate-900 underline-offset-2 transition-colors hover:text-sky-700 hover:underline"
                          onClick={handleComposerLinkClick}
                          onMouseEnter={() => {
                            clearEmbeddedLinkPromptCloseTimer();
                            actions.onOpenEmbeddedLinkPastePrompt(
                              segment.candidate ?? undefined
                            );
                          }}
                          onMouseLeave={scheduleEmbeddedLinkPromptClose}
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
              <motion.button
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                type="button"
                ref={refs.attachButtonRef}
                onClick={actions.onAttachButtonClick}
                aria-label="Lampirkan file"
                aria-expanded={attachments.isAttachModalOpen}
                aria-haspopup="dialog"
                className={`h-8 w-8 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center justify-self-start shrink-0 cursor-pointer ${
                  state.isMessageInputMultiline
                    ? 'col-start-1 row-start-2'
                    : 'col-start-1 row-start-1'
                }`}
              >
                <motion.span
                  animate={{ rotate: attachments.isAttachModalOpen ? 45 : 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <TbPlus size={20} />
                </motion.span>
              </motion.button>
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

            <AnimatePresence>
              {attachments.isAttachModalOpen ? (
                <motion.div
                  ref={refs.attachModalRef}
                  role="dialog"
                  aria-label="Lampirkan file"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute bottom-[calc(100%+10px)] left-0 z-20 inline-flex w-max flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
                >
                  <button
                    type="button"
                    onClick={() => actions.onAttachImageClick()}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbPhoto className="h-4 w-4 text-slate-500" />
                    <span>Gambar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => actions.onAttachDocumentClick()}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg pl-1.5 pr-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbFileDescription className="h-4 w-4 text-slate-500" />
                    <span>Dokumen</span>
                  </button>
                  <button
                    type="button"
                    onClick={actions.onAttachAudioClick}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbMusic className="h-4 w-4 text-slate-500" />
                    <span>Audio</span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
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
        backdropClassName="z-[70] px-4 py-6"
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
        backdropClassName="z-[72] px-4 py-6"
        iframeTitle="Preview dokumen composer"
      />
    </>
  );
};

const ComposerPanel = ({ model }: { model: ComposerPanelModel }) => (
  <ComposerPanelContent model={model} />
);

export default ComposerPanel;
