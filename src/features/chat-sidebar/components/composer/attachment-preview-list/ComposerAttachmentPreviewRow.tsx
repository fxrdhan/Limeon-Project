import type { RefObject } from 'react';
import { TbFileTypeJpg, TbFileTypePng, TbMusic, TbX } from 'react-icons/tb';
import type { PendingComposerAttachment } from '../../../types';
import { resolveComposerAttachmentExtension } from '../../../utils/composer-attachment';
import { formatFileSize } from '../../../utils/message-file';

export const ComposerAttachmentPreviewRow = ({
  attachment,
  imageActionsButtonRef,
  isMenuOpen,
  isSelectedAttachment,
  isSelectionMode,
  onAttachmentMenuIntent,
  onRemovePendingComposerAttachment,
  onSetAttachmentRowRef,
  onToggleAttachmentSelection,
}: {
  attachment: PendingComposerAttachment;
  imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
  isMenuOpen: boolean;
  isSelectedAttachment: boolean;
  isSelectionMode: boolean;
  onAttachmentMenuIntent: (attachmentId: string) => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onSetAttachmentRowRef: (
    attachmentId: string,
    node: HTMLDivElement | null
  ) => void;
  onToggleAttachmentSelection: (attachmentId: string) => void;
}) => {
  const isImageAttachment = attachment.fileKind === 'image';
  const isAudioAttachment = attachment.fileKind === 'audio';
  const isDocumentAttachment = attachment.fileKind === 'document';
  const attachmentExtension = resolveComposerAttachmentExtension(attachment);
  const isJpgDocumentAttachment =
    attachmentExtension === 'jpg' || attachmentExtension === 'jpeg';
  const isPngDocumentAttachment = attachmentExtension === 'png';
  const fileSizeLabel = formatFileSize(attachment.file.size);
  const fileSecondaryLabel =
    [attachment.fileTypeLabel, fileSizeLabel].filter(Boolean).join(' · ') ||
    attachment.fileTypeLabel;

  return (
    <div
      ref={node => {
        onSetAttachmentRowRef(attachment.id, node);
      }}
      data-chat-composer-attachment-id={attachment.id}
      className="h-[54px]"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '54px',
      }}
    >
      <div
        className={`flex h-full w-full items-center gap-2 overflow-hidden rounded-xl border bg-slate-50 p-1 ${
          isSelectionMode && isSelectedAttachment
            ? 'border-emerald-400'
            : 'border-slate-200'
        }`}
      >
        {isImageAttachment ? (
          <button
            ref={isMenuOpen ? imageActionsButtonRef : undefined}
            type="button"
            aria-label={
              isSelectionMode
                ? isSelectedAttachment
                  ? 'Batal pilih gambar'
                  : 'Pilih gambar'
                : 'Aksi gambar'
            }
            title={
              isSelectionMode
                ? isSelectedAttachment
                  ? 'Batal pilih gambar'
                  : 'Pilih gambar'
                : 'Aksi gambar'
            }
            aria-haspopup={isSelectionMode ? undefined : 'menu'}
            aria-expanded={isSelectionMode ? undefined : isMenuOpen}
            aria-pressed={isSelectionMode ? isSelectedAttachment : undefined}
            data-chat-composer-attachment-action-trigger="true"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl text-left transition-colors hover:bg-slate-100/90"
            onClick={event => {
              event.stopPropagation();
              if (isSelectionMode) {
                onToggleAttachmentSelection(attachment.id);
                return;
              }
              onAttachmentMenuIntent(attachment.id);
            }}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
              <img
                src={attachment.previewUrl ?? ''}
                alt={attachment.fileName}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover"
                draggable={false}
              />
            </div>
            <AttachmentText
              attachment={attachment}
              detail={fileSecondaryLabel}
            />
          </button>
        ) : isDocumentAttachment ? (
          <button
            ref={isMenuOpen ? imageActionsButtonRef : undefined}
            type="button"
            aria-label={
              isSelectionMode
                ? isSelectedAttachment
                  ? 'Batal pilih dokumen'
                  : 'Pilih dokumen'
                : 'Aksi dokumen'
            }
            title={
              isSelectionMode
                ? isSelectedAttachment
                  ? 'Batal pilih dokumen'
                  : 'Pilih dokumen'
                : 'Aksi dokumen'
            }
            aria-haspopup={isSelectionMode ? undefined : 'menu'}
            aria-expanded={isSelectionMode ? undefined : isMenuOpen}
            aria-pressed={isSelectionMode ? isSelectedAttachment : undefined}
            data-chat-composer-attachment-action-trigger="true"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl text-left transition-colors hover:bg-slate-100/90"
            onClick={event => {
              event.stopPropagation();
              if (isSelectionMode) {
                onToggleAttachmentSelection(attachment.id);
                return;
              }
              onAttachmentMenuIntent(attachment.id);
            }}
          >
            <DocumentAttachmentThumbnail
              attachment={attachment}
              isJpgDocumentAttachment={isJpgDocumentAttachment}
              isPngDocumentAttachment={isPngDocumentAttachment}
            />
            <AttachmentText
              attachment={attachment}
              detail={fileSecondaryLabel}
            />
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl">
            <TbMusic className="h-5 w-5 shrink-0 text-slate-600" />
            <AttachmentText
              attachment={attachment}
              detail={fileSecondaryLabel}
            />
          </div>
        )}

        {isImageAttachment || isDocumentAttachment ? null : (
          <button
            type="button"
            aria-label={isAudioAttachment ? 'Hapus audio' : 'Hapus dokumen'}
            onClick={() => {
              onRemovePendingComposerAttachment(attachment.id);
            }}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-200 hover:text-black"
          >
            <TbX className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const AttachmentText = ({
  attachment,
  detail,
}: {
  attachment: PendingComposerAttachment;
  detail: string;
}) => (
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium text-slate-800">
      {attachment.fileName}
    </p>
    <p className="truncate text-xs text-slate-500">{detail}</p>
  </div>
);

const DocumentAttachmentThumbnail = ({
  attachment,
  isJpgDocumentAttachment,
  isPngDocumentAttachment,
}: {
  attachment: PendingComposerAttachment;
  isJpgDocumentAttachment: boolean;
  isPngDocumentAttachment: boolean;
}) => {
  if (attachment.pdfCoverUrl) {
    return (
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
        <img
          src={attachment.pdfCoverUrl}
          alt="PDF cover preview"
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  if (isJpgDocumentAttachment) {
    return (
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
        <TbFileTypeJpg className="h-5 w-5 text-slate-600" />
      </div>
    );
  }

  if (isPngDocumentAttachment) {
    return (
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
        <TbFileTypePng className="h-5 w-5 text-slate-600" />
      </div>
    );
  }

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[11px] font-semibold tracking-wide text-slate-700">
      {(
        attachment.fileName.split('.').pop()?.toUpperCase() ||
        attachment.fileTypeLabel
      ).slice(0, 4)}
    </div>
  );
};
