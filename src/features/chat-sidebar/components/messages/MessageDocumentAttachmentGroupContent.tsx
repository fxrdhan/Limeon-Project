import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type { MenuPlacement, MenuSideAnchor } from '../../types';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../../utils/message-file';
import { renderHighlightedText } from '../../utils/message-search';
import { MessageActionPopover } from './MessageActionPopover';
import {
  buildMessageMenuActions,
  getFileIcon,
  getMessageMenuClasses,
} from './messageItemUtils';

interface AttachmentMenuAnchorPosition {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface MessageDocumentAttachmentGroupContentProps {
  messages: ChatMessage[];
  userId?: string;
  captionMessage?: ChatMessage;
  isHighlightedBubble: boolean;
  openMenuMessageId: string | null;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  menuOffsetX: number;
  shouldAnimateMenuOpen: boolean;
  toggleMessageMenu: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getImageMessageUrl: (
    message: Pick<
      ChatMessage,
      'id' | 'message' | 'message_type' | 'file_name' | 'file_mime_type'
    >
  ) => string | null;
  getPdfMessagePreview: (
    message: ChatMessage,
    fileName: string | null
  ) => PdfMessagePreview | undefined;
  openImageInPortal: (
    message: Pick<
      ChatMessage,
      'message' | 'file_storage_path' | 'file_mime_type'
    >,
    previewName: string
  ) => Promise<void>;
  openDocumentInPortal: (
    message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

export const MessageDocumentAttachmentGroupContent = ({
  messages,
  userId,
  captionMessage,
  isHighlightedBubble,
  openMenuMessageId,
  menuPlacement,
  menuSideAnchor,
  menuOffsetX,
  shouldAnimateMenuOpen,
  toggleMessageMenu,
  getAttachmentFileName,
  getImageMessageUrl,
  getPdfMessagePreview,
  openImageInPortal,
  openDocumentInPortal,
  handleCopyMessage,
  handleDownloadMessage,
  handleOpenForwardMessagePicker,
  handleDeleteMessage,
}: MessageDocumentAttachmentGroupContentProps) => {
  const isCurrentUserGroup = messages[0]?.sender_id === userId;
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    menuPlacement,
    menuSideAnchor
  );
  const openMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] =
    useState<AttachmentMenuAnchorPosition | null>(null);
  const openGroupedMenuMessageId =
    openMenuMessageId &&
    messages.some(message => message.id === openMenuMessageId)
      ? openMenuMessageId
      : null;

  useEffect(() => {
    if (!openGroupedMenuMessageId) {
      setMenuAnchorPosition(null);
      return;
    }

    const syncMenuAnchorPosition = () => {
      const triggerElement = openMenuTriggerRef.current;
      if (!triggerElement) {
        setMenuAnchorPosition(null);
        return;
      }

      const rect = triggerElement.getBoundingClientRect();
      setMenuAnchorPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    syncMenuAnchorPosition();
    window.addEventListener('resize', syncMenuAnchorPosition);
    window.addEventListener('scroll', syncMenuAnchorPosition, true);

    return () => {
      window.removeEventListener('resize', syncMenuAnchorPosition);
      window.removeEventListener('scroll', syncMenuAnchorPosition, true);
    };
  }, [openGroupedMenuMessageId]);

  const attachmentRows = messages.map(message => {
    const fileName = getAttachmentFileName(message);
    const fileExtension = resolveFileExtension(
      fileName,
      message.message,
      message.file_mime_type
    );
    const isImageFile = isImageFileExtensionOrMime(
      fileExtension,
      message.file_mime_type
    );
    const isPdfFile =
      fileExtension === 'pdf' ||
      message.file_mime_type?.toLowerCase().includes('pdf') === true;
    const persistedPdfPreviewUrl = isPdfFile
      ? (() => {
          const previewUrl = message.file_preview_url?.trim() || null;
          return previewUrl && isDirectChatAssetUrl(previewUrl)
            ? previewUrl
            : null;
        })()
      : null;
    const resolvedPdfPreviewUrl = isPdfFile
      ? persistedPdfPreviewUrl ||
        getPdfMessagePreview(message, fileName)?.coverDataUrl ||
        null
      : null;
    const fileSizeLabel = formatFileSize(message.file_size);
    const fileTypeLabel = formatFileFallbackLabel(fileExtension, 'document');
    const fileSecondaryLabel =
      [fileTypeLabel, fileSizeLabel].filter(Boolean).join(' · ') ||
      fileTypeLabel;
    const resolvedMessageUrl = isImageFile ? getImageMessageUrl(message) : null;
    const menuActions = buildMessageMenuActions({
      message,
      resolvedMessageUrl,
      isCurrentUser: message.sender_id === userId,
      isImageMessage: false,
      isFileMessage: true,
      isImageFileMessage: isImageFile,
      isPdfFileMessage: isPdfFile,
      fileKind: 'document',
      fileName,
      openImageInPortal,
      openDocumentInPortal,
      handleEditMessage: () => {},
      handleCopyMessage,
      handleDownloadMessage,
      handleOpenForwardMessagePicker,
      handleDeleteMessage,
    });

    return {
      message,
      fileName,
      fileSecondaryLabel,
      fileIcon: getFileIcon(fileExtension, false),
      resolvedPdfPreviewUrl,
      menuActions,
    };
  });

  const captionText = captionMessage?.message?.trim() ?? '';
  const highlightedCaption = renderHighlightedText(captionText, '', {
    linkify: true,
  });

  return (
    <div>
      <div className="flex flex-col gap-2">
        {attachmentRows.map(
          ({
            message,
            fileName,
            fileSecondaryLabel,
            fileIcon,
            resolvedPdfPreviewUrl,
          }) => {
            const isMenuOpen = openGroupedMenuMessageId === message.id;
            const isAnotherAttachmentFocused =
              openGroupedMenuMessageId !== null && !isMenuOpen;

            return (
              <div
                key={message.id}
                data-chat-attachment-row-id={message.id}
                className={`relative overflow-visible transition-[filter,opacity,transform] duration-150 ${
                  isMenuOpen ? 'z-[80]' : 'z-0'
                } ${
                  isAnotherAttachmentFocused ? 'blur-[2px] brightness-95' : ''
                }`}
              >
                <button
                  ref={isMenuOpen ? openMenuTriggerRef : undefined}
                  type="button"
                  aria-label="Aksi lampiran"
                  title="Aksi lampiran"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  onClick={event => {
                    event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMenuAnchorPosition({
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                    });
                    toggleMessageMenu(
                      event.currentTarget,
                      message.id,
                      isCurrentUserGroup ? 'left' : 'right'
                    );
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border p-1 text-left transition-colors ${
                    isCurrentUserGroup
                      ? 'border-emerald-100 bg-emerald-50/85 hover:bg-emerald-100/90'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/90'
                  }`}
                >
                  {resolvedPdfPreviewUrl ? (
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
                      <img
                        src={resolvedPdfPreviewUrl}
                        alt="PDF cover preview"
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    fileIcon
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {fileSecondaryLabel}
                    </p>
                  </div>
                </button>
              </div>
            );
          }
        )}
      </div>

      {typeof document !== 'undefined' &&
      openGroupedMenuMessageId &&
      menuAnchorPosition
        ? createPortal(
            <motion.div
              initial={false}
              animate={{
                top: menuAnchorPosition.top,
                left: menuAnchorPosition.left,
                width: menuAnchorPosition.width,
                height: menuAnchorPosition.height,
              }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 34,
              }}
              className="pointer-events-none fixed z-[140]"
            >
              <div
                className="relative h-full w-full pointer-events-auto"
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <MessageActionPopover
                  isOpen
                  menuId={openGroupedMenuMessageId}
                  shouldAnimateMenuOpen={shouldAnimateMenuOpen}
                  menuPlacement={menuPlacement}
                  menuOffsetX={menuOffsetX}
                  sidePlacementClass={sidePlacementClass}
                  sideArrowAnchorClass={sideArrowAnchorClass}
                  actions={
                    attachmentRows.find(
                      attachmentRow =>
                        attachmentRow.message.id === openGroupedMenuMessageId
                    )?.menuActions ?? []
                  }
                />
              </div>
            </motion.div>,
            document.body
          )
        : null}

      {captionText ? (
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
    </div>
  );
};
