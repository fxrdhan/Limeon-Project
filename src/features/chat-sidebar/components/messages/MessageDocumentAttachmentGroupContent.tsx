import { TbDotsVertical } from 'react-icons/tb';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type { MenuPlacement, MenuSideAnchor } from '../../types';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isDirectChatAssetUrl,
  isImageFileExtensionOrMime,
  openChatFileInNewTab,
  resolveFileExtension,
} from '../../utils/message-file';
import { renderHighlightedText } from '../../utils/message-search';
import { MessageActionPopover } from './MessageActionPopover';
import {
  buildMessageMenuActions,
  getFileIcon,
  getMessageMenuClasses,
} from './messageItemUtils';

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
            menuActions,
            handleOpenAttachment,
          }) => {
            const isMenuOpen = openMenuMessageId === message.id;
            const isAnotherAttachmentFocused =
              openMenuMessageId !== null &&
              messages.some(
                groupedMessage => groupedMessage.id === openMenuMessageId
              ) &&
              !isMenuOpen;

            return (
              <div
                key={message.id}
                data-chat-attachment-row-id={message.id}
                className={`relative transition-[filter,opacity,transform] duration-150 ${
                  isMenuOpen ? 'z-[2]' : 'z-0'
                } ${
                  isAnotherAttachmentFocused ? 'blur-[2px] brightness-95' : ''
                }`}
              >
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

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label="Aksi lampiran"
                      title="Aksi lampiran"
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      onClick={event => {
                        event.stopPropagation();
                        toggleMessageMenu(
                          event.currentTarget,
                          message.id,
                          isCurrentUserGroup ? 'left' : 'right'
                        );
                      }}
                      className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-black transition-colors hover:text-black ${
                        isCurrentUserGroup
                          ? 'hover:bg-emerald-100'
                          : 'hover:bg-slate-200'
                      }`}
                    >
                      <TbDotsVertical className="h-4 w-4" />
                    </button>

                    <MessageActionPopover
                      isOpen={isMenuOpen}
                      menuId={message.id}
                      shouldAnimateMenuOpen={shouldAnimateMenuOpen}
                      menuPlacement={menuPlacement}
                      menuOffsetX={menuOffsetX}
                      sidePlacementClass={sidePlacementClass}
                      sideArrowAnchorClass={sideArrowAnchorClass}
                      actions={menuActions}
                    />
                  </div>
                </div>
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
