import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { TbArrowUpRight, TbCopy, TbFileTypePdf } from 'react-icons/tb';
import { CHAT_SIDEBAR_TOASTER_ID } from '../../constants';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import { copyTextToClipboard } from '../../utils/clipboard';

interface MessageBubbleContentProps {
  message: ChatMessage;
  resolvedMessageUrl: string | null;
  isSelectionMode: boolean;
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
  isHighlightedBubble: boolean;
  onToggleExpand: () => void;
}

const LINK_CONTEXT_MENU_WIDTH = 148;
const LINK_CONTEXT_MENU_EDGE_MARGIN = 12;

type LinkContextMenuState = {
  href: string;
  text: string;
  top: number;
  left: number;
};

export const MessageBubbleContent = ({
  resolvedMessageUrl,
  isSelectionMode,
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
  isHighlightedBubble,
  onToggleExpand,
}: MessageBubbleContentProps) => {
  const [linkContextMenu, setLinkContextMenu] =
    useState<LinkContextMenuState | null>(null);
  const linkContextMenuRef = useRef<HTMLDivElement | null>(null);
  const isSquareImageAttachment = isImageMessage || isImageFileMessage;

  useEffect(() => {
    if (!linkContextMenu) return;

    const closeLinkContextMenu = (event?: Event) => {
      if (
        event?.target instanceof Node &&
        linkContextMenuRef.current?.contains(event.target)
      ) {
        return;
      }

      setLinkContextMenu(null);
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLinkContextMenu(null);
      }
    };

    window.addEventListener('pointerdown', closeLinkContextMenu);
    window.addEventListener('resize', closeLinkContextMenu);
    window.addEventListener('scroll', closeLinkContextMenu, true);
    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('pointerdown', closeLinkContextMenu);
      window.removeEventListener('resize', closeLinkContextMenu);
      window.removeEventListener('scroll', closeLinkContextMenu, true);
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [linkContextMenu]);

  const linkContextMenuActions: PopupMenuAction[] = linkContextMenu
    ? [
        {
          label: 'Buka',
          icon: <TbArrowUpRight className="h-4 w-4" />,
          onClick: () => {
            window.open(linkContextMenu.href, '_blank', 'noopener,noreferrer');
            setLinkContextMenu(null);
          },
        },
        {
          label: 'Salin',
          icon: <TbCopy className="h-4 w-4" />,
          onClick: () => {
            void copyTextToClipboard(linkContextMenu.text)
              .then(() => {
                toast.success('Link berhasil disalin', {
                  toasterId: CHAT_SIDEBAR_TOASTER_ID,
                });
              })
              .catch(error => {
                console.error('Error copying visible message link:', error);
                toast.error('Gagal menyalin link', {
                  toasterId: CHAT_SIDEBAR_TOASTER_ID,
                });
              })
              .finally(() => {
                setLinkContextMenu(null);
              });
          },
        },
      ]
    : [];

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
    <div className="w-full overflow-hidden rounded-xl bg-white/65 text-slate-800">
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
    <div className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-xl bg-white/65 px-2 py-2 text-slate-800">
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
              isHighlightedBubble ? 'text-white/95' : 'text-primary'
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
            isHighlightedBubble ? 'text-white/95' : 'text-primary'
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
    <div
      className={isSelectionMode ? 'pointer-events-none' : undefined}
      onContextMenuCapture={event => {
        const anchorElement =
          event.target instanceof HTMLAnchorElement
            ? event.target
            : event.target instanceof Element
              ? event.target.closest('a[href]')
              : event.target instanceof Node
                ? event.target.parentElement?.closest('a[href]') || null
                : null;
        if (!(anchorElement instanceof HTMLAnchorElement)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const maxLeft =
          window.innerWidth -
          LINK_CONTEXT_MENU_EDGE_MARGIN -
          LINK_CONTEXT_MENU_WIDTH;
        const clampedLeft = Math.max(
          LINK_CONTEXT_MENU_EDGE_MARGIN,
          Math.min(event.clientX, maxLeft)
        );
        const clampedTop = Math.max(
          LINK_CONTEXT_MENU_EDGE_MARGIN,
          Math.min(event.clientY, window.innerHeight - 96)
        );

        setLinkContextMenu({
          href: anchorElement.href,
          text: anchorElement.textContent?.trim() || anchorElement.href,
          left: clampedLeft,
          top: clampedTop,
        });
      }}
    >
      {mainContent}
      {hasAttachmentCaption ? (
        <p
          className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${
            isHighlightedBubble ? 'text-white' : 'text-slate-800'
          }`}
          style={{
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {highlightedCaption}
        </p>
      ) : null}
      {typeof document !== 'undefined' && linkContextMenu
        ? createPortal(
            <PopupMenuPopover
              isOpen
              className="fixed z-[130] origin-top-left"
              style={{
                top: linkContextMenu.top,
                left: linkContextMenu.left,
              }}
            >
              <div
                ref={linkContextMenuRef}
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <PopupMenuContent
                  actions={linkContextMenuActions}
                  minWidthClassName="min-w-[148px]"
                />
              </div>
            </PopupMenuPopover>,
            document.body
          )
        : null}
    </div>
  );
};
