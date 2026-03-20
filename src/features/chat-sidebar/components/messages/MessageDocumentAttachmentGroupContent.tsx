import PopupMenuContent from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TbDotsVertical } from 'react-icons/tb';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  openChatFileInNewTab,
  resolveFileExtension,
} from '../../utils/message-file';
import { renderHighlightedText } from '../../utils/message-search';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import { buildMessageMenuActions, getFileIcon } from './messageItemUtils';

interface MessageDocumentAttachmentGroupContentProps {
  messages: ChatMessage[];
  userId?: string;
  captionMessage?: ChatMessage;
  isHighlightedBubble: boolean;
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
  const [openAttachmentMenuMessageId, setOpenAttachmentMenuMessageId] =
    useState<string | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const isCurrentUserGroup = messages[0]?.sender_id === userId;

  useEffect(() => {
    if (!openAttachmentMenuMessageId) {
      return;
    }

    const closeAttachmentMenu = (event?: Event) => {
      if (
        event?.target instanceof Node &&
        attachmentMenuRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpenAttachmentMenuMessageId(null);
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenAttachmentMenuMessageId(null);
      }
    };

    window.addEventListener('pointerdown', closeAttachmentMenu);
    window.addEventListener('resize', closeAttachmentMenu);
    window.addEventListener('scroll', closeAttachmentMenu, true);
    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('pointerdown', closeAttachmentMenu);
      window.removeEventListener('resize', closeAttachmentMenu);
      window.removeEventListener('scroll', closeAttachmentMenu, true);
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [openAttachmentMenuMessageId]);

  const attachmentRows = useMemo(
    () =>
      messages.map(message => {
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
        const fileTypeLabel = formatFileFallbackLabel(
          fileExtension,
          'document'
        );
        const fileSecondaryLabel =
          [fileTypeLabel, fileSizeLabel].filter(Boolean).join(' · ') ||
          fileTypeLabel;
        const resolvedMessageUrl = isImageFile
          ? getImageMessageUrl(message)
          : null;
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
        }).map(action => ({
          ...action,
          onClick: () => {
            action.onClick();
            setOpenAttachmentMenuMessageId(null);
          },
        }));

        const handleOpenAttachment = () => {
          if (isImageFile) {
            void openImageInPortal(
              resolvedMessageUrl
                ? {
                    ...message,
                    message: resolvedMessageUrl,
                  }
                : message,
              fileName || 'Gambar'
            );
            return;
          }

          if (isPdfFile) {
            void openDocumentInPortal(message, fileName || 'Dokumen', true);
            return;
          }

          void openChatFileInNewTab(
            message.message,
            message.file_storage_path,
            message.file_mime_type
          );
        };

        return {
          message,
          fileName,
          fileSecondaryLabel,
          fileIcon: getFileIcon(fileExtension, false),
          resolvedPdfPreviewUrl,
          menuActions,
          handleOpenAttachment,
        };
      }),
    [
      getAttachmentFileName,
      getImageMessageUrl,
      getPdfMessagePreview,
      handleCopyMessage,
      handleDeleteMessage,
      handleDownloadMessage,
      handleOpenForwardMessagePicker,
      messages,
      openDocumentInPortal,
      openImageInPortal,
      userId,
    ]
  );

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
            menuActions,
            handleOpenAttachment,
          }) => {
            const isMenuOpen = openAttachmentMenuMessageId === message.id;

            return (
              <div key={message.id} className="relative">
                <div
                  className={`flex w-full items-center gap-2 rounded-xl border p-1 ${
                    isCurrentUserGroup
                      ? 'border-emerald-100 bg-emerald-50/85'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg text-left transition-colors ${
                      isCurrentUserGroup
                        ? 'hover:bg-emerald-100/90'
                        : 'hover:bg-slate-100/90'
                    }`}
                    onClick={event => {
                      event.stopPropagation();
                      handleOpenAttachment();
                    }}
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

                  <button
                    type="button"
                    aria-label="Aksi lampiran"
                    title="Aksi lampiran"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    onClick={event => {
                      event.stopPropagation();
                      setOpenAttachmentMenuMessageId(currentMessageId =>
                        currentMessageId === message.id ? null : message.id
                      );
                    }}
                    className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-black transition-colors hover:text-black ${
                      isCurrentUserGroup
                        ? 'hover:bg-emerald-100'
                        : 'hover:bg-slate-200'
                    }`}
                  >
                    <TbDotsVertical className="h-4 w-4" />
                  </button>
                </div>

                <PopupMenuPopover
                  isOpen={isMenuOpen}
                  className="absolute right-0 top-full z-[70] mt-2"
                  onClick={event => event.stopPropagation()}
                >
                  <div ref={isMenuOpen ? attachmentMenuRef : undefined}>
                    <PopupMenuContent
                      actions={menuActions}
                      minWidthClassName="min-w-[120px]"
                      enableArrowNavigation
                      autoFocusFirstItem
                      iconClassName="[&>svg]:!text-black hover:[&>svg]:!text-black data-[preselected=true]:[&>svg]:!text-black"
                    />
                  </div>
                </PopupMenuPopover>
              </div>
            );
          }
        )}
      </div>

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
