import { motion } from 'motion/react';
import type { MouseEvent, RefObject } from 'react';
import {
  TbDotsVertical,
  TbFileTypeJpg,
  TbFileTypePng,
  TbMusic,
  TbX,
} from 'react-icons/tb';
import type { PendingComposerAttachment } from '../../types';
import { resolveComposerAttachmentExtension } from '../../utils/composer-attachment';

interface ComposerAttachmentPreviewListProps {
  attachments: PendingComposerAttachment[];
  openImageActionsAttachmentId: string | null;
  imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
  transition: {
    duration: number;
    ease:
      | 'easeIn'
      | 'easeOut'
      | 'easeInOut'
      | readonly [number, number, number, number];
    layout: {
      type: 'tween';
      ease: readonly [number, number, number, number];
      duration: number;
    };
  };
  onOpenComposerImagePreview: (attachmentId: string) => void;
  onOpenDocumentAttachment: (attachment: PendingComposerAttachment) => void;
  onToggleImageActionsMenu: (
    event: MouseEvent<HTMLButtonElement>,
    attachmentId: string
  ) => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
}

const ComposerAttachmentPreviewList = ({
  attachments,
  openImageActionsAttachmentId,
  imageActionsButtonRef,
  transition,
  onOpenComposerImagePreview,
  onOpenDocumentAttachment,
  onToggleImageActionsMenu,
  onRemovePendingComposerAttachment,
}: ComposerAttachmentPreviewListProps) => (
  <motion.div
    layout
    key="composer-attachments-preview"
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 2 }}
    transition={transition}
    className="mb-2"
  >
    <div className="mb-1 px-0.5 text-[11px] text-slate-500">
      Lampiran {attachments.length}/5
    </div>
    <div className="flex flex-col gap-2 pr-1">
      {attachments.map(attachment => {
        const isImageAttachment = attachment.fileKind === 'image';
        const isAudioAttachment = attachment.fileKind === 'audio';
        const isDocumentAttachment = attachment.fileKind === 'document';
        const attachmentExtension =
          resolveComposerAttachmentExtension(attachment);
        const isJpgDocumentAttachment =
          attachmentExtension === 'jpg' || attachmentExtension === 'jpeg';
        const isPngDocumentAttachment = attachmentExtension === 'png';
        const isMenuOpen = openImageActionsAttachmentId === attachment.id;

        return (
          <div
            key={attachment.id}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
          >
            {isImageAttachment ? (
              <div
                role="button"
                tabIndex={0}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg text-left transition-colors hover:bg-slate-100/90"
                onClick={() => {
                  onOpenComposerImagePreview(attachment.id);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenComposerImagePreview(attachment.id);
                  }
                }}
              >
                <img
                  src={attachment.previewUrl ?? ''}
                  alt={attachment.fileName}
                  className="h-11 w-11 rounded-lg object-cover"
                  draggable={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {attachment.fileTypeLabel}
                  </p>
                </div>
              </div>
            ) : isDocumentAttachment ? (
              <div
                role="button"
                tabIndex={0}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg text-left transition-colors hover:bg-slate-100/90"
                onClick={() => {
                  onOpenDocumentAttachment(attachment);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenDocumentAttachment(attachment);
                  }
                }}
              >
                {attachment.pdfCoverUrl ? (
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
                    <img
                      src={attachment.pdfCoverUrl}
                      alt="PDF cover preview"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                ) : isJpgDocumentAttachment ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                    <TbFileTypeJpg className="h-5 w-5 text-slate-600" />
                  </div>
                ) : isPngDocumentAttachment ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                    <TbFileTypePng className="h-5 w-5 text-slate-600" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[11px] font-semibold tracking-wide text-slate-700">
                    {(
                      attachment.fileName.split('.').pop()?.toUpperCase() ||
                      attachment.fileTypeLabel
                    ).slice(0, 4)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {attachment.fileTypeLabel}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg">
                <TbMusic className="h-5 w-5 shrink-0 text-slate-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {attachment.fileTypeLabel}
                  </p>
                </div>
              </div>
            )}

            {isImageAttachment || isDocumentAttachment ? (
              <div className="relative shrink-0">
                <button
                  ref={isMenuOpen ? imageActionsButtonRef : undefined}
                  type="button"
                  aria-label={
                    isImageAttachment ? 'Aksi gambar' : 'Aksi dokumen'
                  }
                  title={isImageAttachment ? 'Aksi gambar' : 'Aksi dokumen'}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  onClick={event => {
                    event.stopPropagation();
                    onToggleImageActionsMenu(event, attachment.id);
                  }}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                >
                  <TbDotsVertical className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={isAudioAttachment ? 'Hapus audio' : 'Hapus dokumen'}
                onClick={() => {
                  onRemovePendingComposerAttachment(attachment.id);
                }}
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <TbX className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  </motion.div>
);

export default ComposerAttachmentPreviewList;
