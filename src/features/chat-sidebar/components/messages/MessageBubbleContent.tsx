import type { ReactNode } from 'react';
import { TbFileTypePdf } from 'react-icons/tb';
import type { ChatMessage } from '../../data/chatSidebarGateway';

interface MessageBubbleContentProps {
  message: ChatMessage;
  resolvedMessageUrl: string | null;
  isImageMessage: boolean;
  isFileMessage: boolean;
  isImageFileMessage: boolean;
  isPdfFileMessage: boolean;
  hasAttachmentCaption: boolean;
  fileName: string | null;
  fileSecondaryLabel: string | null;
  fileIcon: ReactNode;
  resolvedPdfPreviewUrl: string | null;
  pdfMetaLabel: string | null;
  highlightedMessage: ReactNode;
  highlightedCaption: ReactNode;
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
  isMessageLong: boolean;
  isExpanded: boolean;
  isFlashingTarget: boolean;
  onToggleExpand: () => void;
}

export const MessageBubbleContent = ({
  resolvedMessageUrl,
  isImageMessage,
  isFileMessage,
  isImageFileMessage,
  isPdfFileMessage,
  hasAttachmentCaption,
  fileName,
  fileSecondaryLabel,
  fileIcon,
  resolvedPdfPreviewUrl,
  pdfMetaLabel,
  highlightedMessage,
  highlightedCaption,
  hasLeadingEllipsis,
  hasTrailingEllipsis,
  isMessageLong,
  isExpanded,
  isFlashingTarget,
  onToggleExpand,
}: MessageBubbleContentProps) => {
  const isSquareImageAttachment = isImageMessage || isImageFileMessage;

  const mainContent = isSquareImageAttachment ? (
    <div className="w-full overflow-hidden rounded-xl bg-slate-100">
      <div className="aspect-square w-full overflow-hidden">
        {resolvedMessageUrl ? (
          <img
            src={resolvedMessageUrl}
            alt={fileName ? `Preview ${fileName}` : 'Preview lampiran chat'}
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
            Memuat gambar...
          </div>
        )}
      </div>
    </div>
  ) : isPdfFileMessage ? (
    <div className="w-full overflow-hidden rounded-lg bg-white/65 text-slate-800">
      <div className="h-32 w-full overflow-hidden border-b border-slate-200 bg-white">
        {resolvedPdfPreviewUrl ? (
          <img
            src={resolvedPdfPreviewUrl}
            alt={`Preview ${fileName || 'dokumen PDF'}`}
            className="h-full w-full object-cover object-top"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TbFileTypePdf className="h-10 w-10 text-slate-500" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-2 py-2">
        <TbFileTypePdf className="h-8 w-8 shrink-0 text-slate-600" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="block w-full truncate text-sm font-medium text-slate-800">
            {fileName}
          </p>
          <p className="text-xs text-slate-500">{pdfMetaLabel}</p>
        </div>
      </div>
    </div>
  ) : isFileMessage ? (
    <div className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-lg bg-white/65 px-2 py-2 text-slate-800">
      {fileIcon}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="block w-full truncate text-sm font-medium text-slate-800">
          {fileName}
        </p>
        <p className="text-xs text-slate-500">{fileSecondaryLabel}</p>
      </div>
    </div>
  ) : (
    <>
      {hasLeadingEllipsis ? <span>... </span> : null}
      {highlightedMessage}
      {isMessageLong ? (
        <>
          {hasTrailingEllipsis ? <span>... </span> : null}
          <span
            className={`font-medium ${
              isFlashingTarget ? 'text-white/95' : 'text-primary'
            }`}
            role="button"
            tabIndex={0}
            onClick={event => {
              event.stopPropagation();
              onToggleExpand();
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onToggleExpand();
              }
            }}
          >
            Baca selengkapnya
          </span>
        </>
      ) : isExpanded ? (
        <span
          className={`block font-medium ${
            isFlashingTarget ? 'text-white/95' : 'text-primary'
          }`}
          role="button"
          tabIndex={0}
          onClick={event => {
            event.stopPropagation();
            onToggleExpand();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onToggleExpand();
            }
          }}
        >
          Ringkas
        </span>
      ) : null}
    </>
  );

  return (
    <>
      {mainContent}
      {hasAttachmentCaption ? (
        <p
          className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${
            isFlashingTarget ? 'text-white' : 'text-slate-800'
          }`}
        >
          {highlightedCaption}
        </p>
      ) : null}
    </>
  );
};
