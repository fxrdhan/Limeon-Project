import { motion } from 'motion/react';
import {
  forwardRef,
  useEffect,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import { TbFileTypeJpg, TbFileTypePng, TbMusic, TbX } from 'react-icons/tb';
import type {
  ComposerAttachmentPreviewItem,
  PendingComposerAttachment,
} from '../../types';
import { resolveComposerAttachmentExtension } from '../../utils/composer-attachment';
import { formatFileSize } from '../../utils/message-file';

interface ComposerAttachmentPreviewListProps {
  attachments: ComposerAttachmentPreviewItem[];
  openImageActionsAttachmentId: string | null;
  isSelectionMode: boolean;
  selectedAttachmentIds: string[];
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
  onToggleImageActionsMenu: (
    event: MouseEvent<HTMLButtonElement>,
    attachmentId: string
  ) => void;
  onToggleAttachmentSelection: (attachmentId: string) => void;
  onCancelLoadingComposerAttachment: (attachmentId: string) => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
}

const ComposerAttachmentPreviewList = forwardRef<
  HTMLDivElement,
  ComposerAttachmentPreviewListProps
>(
  (
    {
      attachments,
      openImageActionsAttachmentId,
      isSelectionMode,
      selectedAttachmentIds = [],
      imageActionsButtonRef,
      transition,
      onToggleImageActionsMenu,
      onToggleAttachmentSelection,
      onCancelLoadingComposerAttachment,
      onRemovePendingComposerAttachment,
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
    const resolveCompressionStatusLabel = (
      phase: 'uploading' | 'processing' | 'done' | undefined
    ) => {
      if (phase === 'done') {
        return 'Selesai';
      }
      if (phase === 'processing') {
        return 'Memproses';
      }
      return 'Mengunggah';
    };

    return (
      <motion.div
        ref={ref}
        layout
        key="composer-attachments-preview"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 2 }}
        transition={transition}
        className="h-full min-h-0 overflow-hidden"
      >
        <div className="h-full min-h-0 overflow-y-auto pr-1 overscroll-contain">
          {attachments.map(attachment => {
            if ('status' in attachment && attachment.status === 'loading') {
              const isPdfCompressionLoading =
                attachment.loadingKind === 'pdf-compression';

              return (
                <div
                  key={attachment.id}
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-200" />
                    <div className="min-w-0 flex-1">
                      {isPdfCompressionLoading ? (
                        <>
                          <p className="text-sm font-medium text-slate-700">
                            {resolveCompressionStatusLabel(
                              attachment.loadingPhase
                            )}
                            {animatedDots}
                          </p>
                          <p className="text-xs text-slate-500">Kompres PDF</p>
                        </>
                      ) : (
                        <>
                          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                          <div className="mt-1 h-3 w-14 animate-pulse rounded bg-slate-200" />
                        </>
                      )}
                    </div>
                  </div>
                  {isPdfCompressionLoading ? (
                    <button
                      type="button"
                      aria-label="Batalkan kompres PDF"
                      onClick={() => {
                        onCancelLoadingComposerAttachment(attachment.id);
                      }}
                      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-200 hover:text-black"
                    >
                      <TbX className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );
            }

            const resolvedAttachment = attachment as PendingComposerAttachment;
            const isImageAttachment = resolvedAttachment.fileKind === 'image';
            const isAudioAttachment = resolvedAttachment.fileKind === 'audio';
            const isDocumentAttachment =
              resolvedAttachment.fileKind === 'document';
            const attachmentExtension =
              resolveComposerAttachmentExtension(resolvedAttachment);
            const isJpgDocumentAttachment =
              attachmentExtension === 'jpg' || attachmentExtension === 'jpeg';
            const isPngDocumentAttachment = attachmentExtension === 'png';
            const isMenuOpen = openImageActionsAttachmentId === attachment.id;
            const isSelectedAttachment = selectedAttachmentIds.includes(
              attachment.id
            );
            const fileSizeLabel = formatFileSize(resolvedAttachment.file.size);
            const fileSecondaryLabel =
              [resolvedAttachment.fileTypeLabel, fileSizeLabel]
                .filter(Boolean)
                .join(' · ') || resolvedAttachment.fileTypeLabel;

            return (
              <div
                key={attachment.id}
                className={`flex w-full items-center gap-2 rounded-xl border bg-slate-50 p-1 ${
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
                    aria-pressed={
                      isSelectionMode ? isSelectedAttachment : undefined
                    }
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl text-left transition-colors hover:bg-slate-100/90"
                    onClick={event => {
                      event.stopPropagation();
                      if (isSelectionMode) {
                        onToggleAttachmentSelection(attachment.id);
                        return;
                      }
                      onToggleImageActionsMenu(event, attachment.id);
                    }}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={resolvedAttachment.previewUrl ?? ''}
                        alt={resolvedAttachment.fileName}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {attachment.fileName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {fileSecondaryLabel}
                      </p>
                    </div>
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
                    aria-pressed={
                      isSelectionMode ? isSelectedAttachment : undefined
                    }
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl text-left transition-colors hover:bg-slate-100/90"
                    onClick={event => {
                      event.stopPropagation();
                      if (isSelectionMode) {
                        onToggleAttachmentSelection(attachment.id);
                        return;
                      }
                      onToggleImageActionsMenu(event, attachment.id);
                    }}
                  >
                    {resolvedAttachment.pdfCoverUrl ? (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
                        <img
                          src={resolvedAttachment.pdfCoverUrl}
                          alt="PDF cover preview"
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </div>
                    ) : isJpgDocumentAttachment ? (
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                        <TbFileTypeJpg className="h-5 w-5 text-slate-600" />
                      </div>
                    ) : isPngDocumentAttachment ? (
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                        <TbFileTypePng className="h-5 w-5 text-slate-600" />
                      </div>
                    ) : (
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[11px] font-semibold tracking-wide text-slate-700">
                        {(
                          resolvedAttachment.fileName
                            .split('.')
                            .pop()
                            ?.toUpperCase() || resolvedAttachment.fileTypeLabel
                        ).slice(0, 4)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {attachment.fileName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {fileSecondaryLabel}
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl">
                    <TbMusic className="h-5 w-5 shrink-0 text-slate-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {attachment.fileName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {fileSecondaryLabel}
                      </p>
                    </div>
                  </div>
                )}

                {isImageAttachment || isDocumentAttachment ? null : (
                  <button
                    type="button"
                    aria-label={
                      isAudioAttachment ? 'Hapus audio' : 'Hapus dokumen'
                    }
                    onClick={() => {
                      onRemovePendingComposerAttachment(attachment.id);
                    }}
                    className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-200 hover:text-black"
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
  }
);

ComposerAttachmentPreviewList.displayName = 'ComposerAttachmentPreviewList';

export default ComposerAttachmentPreviewList;
