import { AnimatePresence, motion } from 'motion/react';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
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
import { useComposerAttachmentPreview } from '../hooks/useComposerAttachmentPreview';
import type { PendingComposerAttachment } from '../types';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import ComposerAttachmentPreviewList from './composer/ComposerAttachmentPreviewList';
import ComposerEditBanner from './composer/ComposerEditBanner';

export interface ComposerPanelModel {
  message: string;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerAttachments: PendingComposerAttachment[];
  previewComposerImageAttachment: PendingComposerAttachment | undefined;
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  composerContainerRef: RefObject<HTMLDivElement | null>;
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  onMessageChange: (nextMessage: string) => void;
  onKeyDown: (e: ReactKeyboardEvent) => void;
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onAttachButtonClick: () => void;
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onAttachAudioClick: () => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDocumentFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAudioFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCancelEditMessage: () => void;
  onFocusEditingTargetMessage: () => void;
  onOpenComposerImagePreview: (attachmentId: string) => void;
  onCloseComposerImagePreview: () => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onQueueComposerImage: (file: File, replaceAttachmentId?: string) => boolean;
}

const ComposerPanel = ({ model }: { model: ComposerPanelModel }) => {
  const {
    message,
    editingMessagePreview,
    messageInputHeight,
    isMessageInputMultiline,
    isSendSuccessGlowVisible,
    isAttachModalOpen,
    pendingComposerAttachments,
    previewComposerImageAttachment,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    messageInputRef,
    composerContainerRef,
    attachButtonRef,
    attachModalRef,
    imageInputRef,
    documentInputRef,
    audioInputRef,
    onMessageChange,
    onKeyDown,
    onPaste,
    onSendMessage,
    onAttachButtonClick,
    onAttachImageClick,
    onAttachDocumentClick,
    onAttachAudioClick,
    onImageFileChange,
    onDocumentFileChange,
    onAudioFileChange,
    onCancelEditMessage,
    onFocusEditingTargetMessage,
    onOpenComposerImagePreview,
    onCloseComposerImagePreview,
    onRemovePendingComposerAttachment,
    onQueueComposerImage,
  } = model;
  const {
    openImageActionsAttachmentId,
    imageActionsMenuPosition,
    composerDocumentPreviewUrl,
    composerDocumentPreviewName,
    isComposerDocumentPreviewVisible,
    imageActionsButtonRef,
    imageActionsMenuRef,
    imageActions,
    closeComposerDocumentPreview,
    openDocumentAttachmentInPortal,
    handleToggleImageActionsMenu,
  } = useComposerAttachmentPreview({
    pendingComposerAttachments,
    onAttachImageClick,
    onAttachDocumentClick,
    onRemovePendingComposerAttachment,
    onOpenComposerImagePreview,
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
        ref={composerContainerRef}
        className="absolute bottom-2 left-0 right-0 px-3 pb-4"
      >
        <motion.div
          layout
          initial={false}
          animate={
            isSendSuccessGlowVisible
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
            isSendSuccessGlowVisible
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
              {editingMessagePreview ? (
                <ComposerEditBanner
                  editingMessagePreview={editingMessagePreview}
                  onCancelEditMessage={onCancelEditMessage}
                  onFocusEditingTargetMessage={onFocusEditingTargetMessage}
                  transition={contextualPanelTransition}
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false} mode="popLayout">
              {pendingComposerAttachments.length > 0 ? (
                <ComposerAttachmentPreviewList
                  attachments={pendingComposerAttachments}
                  openImageActionsAttachmentId={openImageActionsAttachmentId}
                  imageActionsButtonRef={imageActionsButtonRef}
                  transition={contextualPanelTransition}
                  onOpenComposerImagePreview={onOpenComposerImagePreview}
                  onOpenDocumentAttachment={openDocumentAttachmentInPortal}
                  onToggleImageActionsMenu={handleToggleImageActionsMenu}
                  onRemovePendingComposerAttachment={
                    onRemovePendingComposerAttachment
                  }
                />
              ) : null}
            </AnimatePresence>

            {typeof document !== 'undefined' &&
            openImageActionsAttachmentId &&
            imageActionsMenuPosition
              ? createPortal(
                  <PopupMenuPopover
                    isOpen
                    className="fixed z-[120] origin-top-right"
                    style={{
                      top: imageActionsMenuPosition.top,
                      left: imageActionsMenuPosition.left,
                    }}
                  >
                    <div
                      ref={imageActionsMenuRef}
                      onClick={event => event.stopPropagation()}
                      role="presentation"
                    >
                      <PopupMenuContent
                        actions={imageActions}
                        minWidthClassName="min-w-[132px]"
                      />
                    </div>
                  </PopupMenuPopover>,
                  document.body
                )
              : null}

            <motion.div
              layout
              transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
              className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
                isMessageInputMultiline
                  ? 'grid-rows-[auto_auto] gap-y-1 items-end'
                  : 'grid-rows-[auto] gap-y-0 items-center'
              }`}
            >
              <motion.textarea
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                ref={messageInputRef}
                value={message}
                onChange={event => onMessageChange(event.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                placeholder="Type a message..."
                rows={1}
                style={{ height: `${messageInputHeight}px` }}
                className={`w-full resize-none bg-transparent border-0 p-0 text-[15px] leading-[22px] text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isMessageInputMultiline
                    ? 'col-span-3 row-start-1 self-start'
                    : 'col-start-2 row-start-1 self-center'
                }`}
              />
              <motion.button
                layout="position"
                transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
                type="button"
                ref={attachButtonRef}
                onClick={onAttachButtonClick}
                aria-label="Attach file"
                aria-expanded={isAttachModalOpen}
                aria-haspopup="dialog"
                className={`h-8 w-8 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center justify-self-start shrink-0 cursor-pointer ${
                  isMessageInputMultiline
                    ? 'col-start-1 row-start-2'
                    : 'col-start-1 row-start-1'
                }`}
              >
                <motion.span
                  animate={{ rotate: isAttachModalOpen ? 45 : 0 }}
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
                onClick={onSendMessage}
                aria-label="Send message"
                className={`h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center justify-self-end cursor-pointer whitespace-nowrap shrink-0 ${
                  isMessageInputMultiline
                    ? 'col-start-3 row-start-2'
                    : 'col-start-3 row-start-1'
                }`}
              >
                <TbArrowUp size={20} className="text-white" />
              </motion.button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImageFileChange}
              />
              <input
                ref={documentInputRef}
                type="file"
                accept="*/*"
                multiple
                className="hidden"
                onChange={onDocumentFileChange}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={onAudioFileChange}
              />
            </motion.div>

            <AnimatePresence>
              {isAttachModalOpen ? (
                <motion.div
                  ref={attachModalRef}
                  role="dialog"
                  aria-label="Attach file"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute bottom-[calc(100%+10px)] left-0 z-20 inline-flex w-max flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
                >
                  <button
                    type="button"
                    onClick={() => onAttachImageClick()}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbPhoto className="h-4 w-4 text-slate-500" />
                    <span>Gambar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAttachDocumentClick()}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg pl-1.5 pr-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbFileDescription className="h-4 w-4 text-slate-500" />
                    <span>Dokumen</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAttachAudioClick}
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
          previewComposerImageAttachment && isComposerImageExpanded
        )}
        isVisible={isComposerImageExpandedVisible}
        onClose={onCloseComposerImagePreview}
        backdropClassName="z-[70] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCloseComposerImagePreview();
          }
        }}
      >
        {previewComposerImageAttachment ? (
          <ImageUploader
            id="chat-composer-image-preview"
            shape="rounded"
            hasImage={true}
            onPopupClose={onCloseComposerImagePreview}
            className="max-h-[92vh] max-w-[92vw]"
            popupTrigger="click"
            onImageUpload={async file => {
              onCloseComposerImagePreview();
              onQueueComposerImage(file, previewComposerImageAttachment.id);
            }}
            onImageDelete={async () => {
              onRemovePendingComposerAttachment(
                previewComposerImageAttachment.id
              );
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={previewComposerImageAttachment.previewUrl ?? ''}
              alt={previewComposerImageAttachment.fileName}
              className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
              draggable={false}
            />
          </ImageUploader>
        ) : null}
      </ImageExpandPreview>

      <DocumentPreviewPortal
        isOpen={Boolean(composerDocumentPreviewUrl)}
        isVisible={isComposerDocumentPreviewVisible}
        previewUrl={composerDocumentPreviewUrl}
        previewName={composerDocumentPreviewName}
        onClose={closeComposerDocumentPreview}
        backdropClassName="z-[72] px-4 py-6"
        iframeTitle="Preview dokumen composer"
      />
    </>
  );
};

export default ComposerPanel;
