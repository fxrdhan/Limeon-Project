import { AnimatePresence, motion } from 'motion/react';
import type { RefObject } from 'react';
import {
  TbArrowUp,
  TbFileDescription,
  TbMusic,
  TbPencil,
  TbPhoto,
  TbPlus,
  TbX,
} from 'react-icons/tb';
import ImageUploader from '@/components/image-manager';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import type { PendingComposerFile } from '../types';

interface ComposerPanelProps {
  message: string;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerImage: {
    file: File;
    previewUrl: string;
    fileName: string;
    fileTypeLabel: string;
  } | null;
  pendingComposerFile: PendingComposerFile | null;
  pendingComposerPdfCoverUrl: string | null;
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  composerContainerRef: RefObject<HTMLDivElement | null>;
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  composerSyncLayoutTransition: {
    type: 'tween';
    ease: readonly [number, number, number, number];
    duration: number;
  };
  composerBaseBorderColor: string;
  composerBaseShadow: string;
  composerGlowShadowPeak: string;
  composerGlowShadowHigh: string;
  composerGlowShadowMid: string;
  composerGlowShadowFade: string;
  composerGlowShadowLow: string;
  sendSuccessGlowDuration: number;
  onMessageChange: (nextMessage: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onAttachButtonClick: () => void;
  onAttachImageClick: () => void;
  onAttachDocumentClick: () => void;
  onAttachAudioClick: () => void;
  onImageFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDocumentFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelEditMessage: () => void;
  onFocusEditingTargetMessage: () => void;
  onOpenComposerImagePreview: () => void;
  onCloseComposerImagePreview: () => void;
  onClearPendingComposerImage: () => void;
  onClearPendingComposerFile: () => void;
  onQueueComposerImage: (file: File) => void;
}

const ComposerPanel = ({
  message,
  editingMessagePreview,
  messageInputHeight,
  isMessageInputMultiline,
  isSendSuccessGlowVisible,
  isAttachModalOpen,
  pendingComposerImage,
  pendingComposerFile,
  pendingComposerPdfCoverUrl,
  isComposerImageExpanded,
  isComposerImageExpandedVisible,
  messageInputRef,
  composerContainerRef,
  attachButtonRef,
  attachModalRef,
  imageInputRef,
  documentInputRef,
  audioInputRef,
  composerSyncLayoutTransition,
  composerBaseBorderColor,
  composerBaseShadow,
  composerGlowShadowPeak,
  composerGlowShadowHigh,
  composerGlowShadowMid,
  composerGlowShadowFade,
  composerGlowShadowLow,
  sendSuccessGlowDuration,
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
  onClearPendingComposerImage,
  onClearPendingComposerFile,
  onQueueComposerImage,
}: ComposerPanelProps) => {
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
                    composerBaseBorderColor,
                    'oklch(50.8% 0.118 165.612 / 0.55)',
                    'oklch(50.8% 0.118 165.612 / 0.48)',
                    'oklch(50.8% 0.118 165.612 / 0.42)',
                    'oklch(50.8% 0.118 165.612 / 0.32)',
                    'oklch(50.8% 0.118 165.612 / 0.22)',
                    composerBaseBorderColor,
                  ],
                  boxShadow: [
                    composerBaseShadow,
                    composerGlowShadowPeak,
                    composerGlowShadowHigh,
                    composerGlowShadowMid,
                    composerGlowShadowFade,
                    composerGlowShadowLow,
                    composerBaseShadow,
                  ],
                }
              : {
                  borderColor: composerBaseBorderColor,
                  boxShadow: composerBaseShadow,
                }
          }
          transition={
            isSendSuccessGlowVisible
              ? {
                  layout: composerSyncLayoutTransition,
                  duration: sendSuccessGlowDuration / 1000,
                  times: [0, 0.12, 0.3, 0.48, 0.66, 0.82, 1],
                  ease: 'easeOut',
                }
              : {
                  layout: composerSyncLayoutTransition,
                  duration: 0.12,
                  ease: 'easeOut',
                }
          }
          className="relative z-10 rounded-2xl border bg-white"
        >
          <motion.div
            layout
            transition={{ layout: composerSyncLayoutTransition }}
            className="relative z-10 rounded-[15px] bg-white px-2.5 py-2.5 transition-[height,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <AnimatePresence initial={false}>
              {editingMessagePreview ? (
                <motion.div
                  layout
                  key="editing-preview-inline"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                    layout: composerSyncLayoutTransition,
                  }}
                  className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-slate-700 transition-colors hover:border-primary/30 hover:bg-slate-100"
                  role="button"
                  tabIndex={0}
                  aria-label="Lihat pesan yang sedang diedit"
                  title="Klik untuk lihat pesan asal"
                  onClick={onFocusEditingTargetMessage}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onFocusEditingTargetMessage();
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-label="Cancel editing message"
                    onClick={event => {
                      event.stopPropagation();
                      onCancelEditMessage();
                    }}
                    className="group inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  >
                    <TbPencil className="h-4 w-4 group-hover:hidden" />
                    <TbX className="hidden h-4 w-4 group-hover:block" />
                  </button>
                  <p className="min-w-0 flex-1 truncate text-left text-sm leading-5 text-slate-700">
                    {editingMessagePreview}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false} mode="popLayout">
              {pendingComposerImage ? (
                <motion.div
                  layout
                  key="composer-image-preview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                    layout: composerSyncLayoutTransition,
                  }}
                  onClick={onOpenComposerImagePreview}
                  role="button"
                  tabIndex={0}
                  aria-label="Perbesar preview gambar"
                  title="Klik untuk perbesar gambar"
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenComposerImagePreview();
                    }
                  }}
                  className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left transition-colors hover:bg-slate-100/90">
                    <img
                      src={pendingComposerImage.previewUrl}
                      alt={pendingComposerImage.fileName}
                      className="h-11 w-11 rounded-lg object-cover"
                      draggable={false}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {pendingComposerImage.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {pendingComposerImage.fileTypeLabel}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Hapus gambar"
                    onClick={event => {
                      event.stopPropagation();
                      onClearPendingComposerImage();
                    }}
                    className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  >
                    <TbX className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false} mode="popLayout">
              {pendingComposerFile ? (
                <motion.div
                  layout
                  key="composer-file-preview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                    layout: composerSyncLayoutTransition,
                  }}
                  className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg">
                    {pendingComposerFile.fileKind === 'audio' ? (
                      <TbMusic className="h-5 w-5 shrink-0 text-slate-600" />
                    ) : pendingComposerPdfCoverUrl ? (
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
                        <img
                          src={pendingComposerPdfCoverUrl}
                          alt="PDF cover preview"
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[11px] font-semibold tracking-wide text-slate-700">
                        {(
                          pendingComposerFile.fileName
                            .split('.')
                            .pop()
                            ?.toUpperCase() || pendingComposerFile.fileTypeLabel
                        ).slice(0, 4)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {pendingComposerFile.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {pendingComposerFile.fileTypeLabel}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      pendingComposerFile.fileKind === 'audio'
                        ? 'Hapus audio'
                        : 'Hapus dokumen'
                    }
                    onClick={onClearPendingComposerFile}
                    className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  >
                    <TbX className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div
              layout
              transition={{ layout: composerSyncLayoutTransition }}
              className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
                isMessageInputMultiline
                  ? 'grid-rows-[auto_auto] gap-y-1 items-end'
                  : 'grid-rows-[auto] gap-y-0 items-center'
              }`}
            >
              <motion.textarea
                layout="position"
                transition={{ layout: composerSyncLayoutTransition }}
                ref={messageInputRef}
                value={message}
                onChange={e => onMessageChange(e.target.value)}
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
                transition={{ layout: composerSyncLayoutTransition }}
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
                transition={{ layout: composerSyncLayoutTransition }}
                onClick={onSendMessage}
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
                className="hidden"
                onChange={onImageFileChange}
              />
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
                className="hidden"
                onChange={onDocumentFileChange}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
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
                    onClick={onAttachImageClick}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbPhoto className="h-4 w-4 text-slate-500" />
                    <span>Gambar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAttachDocumentClick}
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
        isOpen={Boolean(pendingComposerImage && isComposerImageExpanded)}
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
        {pendingComposerImage ? (
          <ImageUploader
            id="chat-composer-image-preview"
            shape="rounded"
            hasImage={true}
            onPopupClose={onCloseComposerImagePreview}
            className="max-h-[92vh] max-w-[92vw]"
            popupTrigger="click"
            onImageUpload={async file => {
              onCloseComposerImagePreview();
              onQueueComposerImage(file);
            }}
            onImageDelete={async () => {
              onClearPendingComposerImage();
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={pendingComposerImage.previewUrl}
              alt={pendingComposerImage.fileName}
              className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
              draggable={false}
            />
          </ImageUploader>
        ) : null}
      </ImageExpandPreview>
    </>
  );
};

export default ComposerPanel;
