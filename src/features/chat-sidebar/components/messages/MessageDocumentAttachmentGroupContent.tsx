import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
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
import { getPdfMessagePreviewUrl } from '../../utils/pdf-message-preview';
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
  menuAnchorRef: RefObject<HTMLDivElement | null>;
  userId?: string;
  captionMessage?: ChatMessage;
  isHighlightedBubble: boolean;
  openMenuMessageId: string | null;
  menuTransitionSourceId: string | null;
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
  getPdfMessagePreview: (
    message: ChatMessage,
    fileName: string | null
  ) => PdfMessagePreview | undefined;
  openImageInPortal: (
    message: Pick<
      ChatMessage,
      | 'id'
      | 'message'
      | 'file_storage_path'
      | 'file_mime_type'
      | 'file_preview_url'
    >,
    previewName: string,
    initialPreviewUrl?: string | null
  ) => Promise<void>;
  openDocumentInPortal: (
    message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadDocumentGroup: (targetMessages: ChatMessage[]) => Promise<void>;
  handleDeleteMessages: (targetMessages: ChatMessage[]) => Promise<unknown>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
  handleReplyMessage: (targetMessage: ChatMessage) => void;
}

export const MessageDocumentAttachmentGroupContent = ({
  messages,
  menuAnchorRef,
  userId,
  captionMessage,
  isHighlightedBubble,
  openMenuMessageId,
  menuTransitionSourceId,
  menuPlacement,
  menuSideAnchor,
  menuOffsetX,
  shouldAnimateMenuOpen,
  toggleMessageMenu,
  getAttachmentFileName,
  getPdfMessagePreview,
  openImageInPortal,
  openDocumentInPortal,
  handleCopyMessage,
  handleDownloadMessage,
  handleDownloadDocumentGroup,
  handleDeleteMessages,
  handleOpenForwardMessagePicker,
  handleDeleteMessage,
  handleReplyMessage,
}: MessageDocumentAttachmentGroupContentProps) => {
  const representativeMessage = messages[messages.length - 1] ?? null;
  const isCurrentUserGroup = messages[0]?.sender_id === userId;
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    menuPlacement,
    menuSideAnchor
  );
  const openMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuAnchorSyncFrameRef = useRef<number | null>(null);
  const [openMenuMode, setOpenMenuMode] = useState<'group' | 'item'>('item');
  const [menuAnchorPosition, setMenuAnchorPosition] =
    useState<AttachmentMenuAnchorPosition | null>(null);
  const isGroupMenuOpen =
    openMenuMode === 'group' &&
    representativeMessage !== null &&
    openMenuMessageId === representativeMessage.id;
  const isGroupMenuTransitionSource =
    openMenuMode === 'group' &&
    representativeMessage !== null &&
    menuTransitionSourceId === representativeMessage.id;
  const openAttachmentMenuMessageId =
    openMenuMessageId &&
    messages.some(message => message.id === openMenuMessageId) &&
    !isGroupMenuOpen
      ? openMenuMessageId
      : null;
  const transitionSourceAttachmentMenuMessageId =
    menuTransitionSourceId &&
    messages.some(message => message.id === menuTransitionSourceId) &&
    !isGroupMenuTransitionSource
      ? menuTransitionSourceId
      : null;
  const activeAttachmentMenuMessageId =
    openAttachmentMenuMessageId ?? transitionSourceAttachmentMenuMessageId;

  useLayoutEffect(() => {
    if (!openMenuMessageId) {
      setOpenMenuMode('item');
    }
  }, [openMenuMessageId]);

  useLayoutEffect(() => {
    if (
      !activeAttachmentMenuMessageId &&
      !isGroupMenuOpen &&
      !isGroupMenuTransitionSource
    ) {
      setMenuAnchorPosition(null);
      return;
    }

    const syncMenuAnchorPosition = () => {
      const triggerElement =
        openMenuMode === 'group'
          ? menuAnchorRef.current
          : openMenuTriggerRef.current;
      if (!triggerElement) {
        if (
          menuAnchorSyncFrameRef.current === null &&
          typeof window !== 'undefined'
        ) {
          menuAnchorSyncFrameRef.current = window.requestAnimationFrame(() => {
            menuAnchorSyncFrameRef.current = null;
            syncMenuAnchorPosition();
          });
        }
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
      if (menuAnchorSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(menuAnchorSyncFrameRef.current);
        menuAnchorSyncFrameRef.current = null;
      }
      window.removeEventListener('resize', syncMenuAnchorPosition);
      window.removeEventListener('scroll', syncMenuAnchorPosition, true);
    };
  }, [
    activeAttachmentMenuMessageId,
    isGroupMenuOpen,
    isGroupMenuTransitionSource,
    menuAnchorRef,
    openMenuMode,
  ]);

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
        getPdfMessagePreviewUrl(getPdfMessagePreview(message, fileName)) ||
        null
      : null;
    const fileSizeLabel = formatFileSize(message.file_size);
    const fileTypeLabel = formatFileFallbackLabel(fileExtension, 'document');
    const fileSecondaryLabel =
      [fileTypeLabel, fileSizeLabel].filter(Boolean).join(' · ') ||
      fileTypeLabel;
    const menuActions = buildMessageMenuActions({
      message,
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
      handleReplyMessage,
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
  const groupMenuActions = representativeMessage
    ? buildMessageMenuActions({
        message: representativeMessage,
        isCurrentUser: representativeMessage.sender_id === userId,
        isImageMessage: false,
        isFileMessage: true,
        isImageFileMessage: false,
        isPdfFileMessage: false,
        fileKind: 'document',
        fileName: null,
        openImageInPortal,
        openDocumentInPortal,
        handleEditMessage: () => {},
        handleReplyMessage,
        handleCopyMessage,
        handleDownloadMessage,
        handleOpenForwardMessagePicker,
        handleDeleteMessage,
      }).map(action =>
        action.label === 'Unduh'
          ? {
              ...action,
              onClick: () => {
                void handleDownloadDocumentGroup(messages);
              },
            }
          : action.label === 'Hapus'
            ? {
                ...action,
                onClick: () => {
                  void handleDeleteMessages(messages);
                },
              }
            : action
      )
    : [];

  const captionText = captionMessage?.message?.trim() ?? '';
  const highlightedCaption = renderHighlightedText(captionText, '', {
    linkify: true,
  });

  return (
    <div
      data-chat-document-group-root
      className="min-w-0"
      onClick={event => {
        if (
          !representativeMessage ||
          event.target !== event.currentTarget ||
          !menuAnchorRef.current
        ) {
          return;
        }

        setOpenMenuMode('group');
        const rect = menuAnchorRef.current.getBoundingClientRect();
        setMenuAnchorPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        toggleMessageMenu(
          menuAnchorRef.current,
          representativeMessage.id,
          isCurrentUserGroup ? 'left' : 'right'
        );
      }}
      role="presentation"
    >
      <div className="flex flex-col gap-2">
        {attachmentRows.map(
          ({
            message,
            fileName,
            fileSecondaryLabel,
            fileIcon,
            resolvedPdfPreviewUrl,
          }) => {
            const isMenuOpen = activeAttachmentMenuMessageId === message.id;
            const isAnotherAttachmentFocused =
              (activeAttachmentMenuMessageId !== null ||
                isGroupMenuOpen ||
                isGroupMenuTransitionSource) &&
              !isMenuOpen;

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
                    setOpenMenuMode('item');
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
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-white">
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
      menuAnchorPosition &&
      (activeAttachmentMenuMessageId ||
        isGroupMenuOpen ||
        isGroupMenuTransitionSource)
        ? createPortal(
            <div
              style={{
                top: menuAnchorPosition.top,
                left: menuAnchorPosition.left,
                width: menuAnchorPosition.width,
                height: menuAnchorPosition.height,
              }}
              className="pointer-events-none fixed z-[70]"
            >
              <div
                className="relative h-full w-full pointer-events-auto"
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <MessageActionPopover
                  isOpen
                  menuId={
                    isGroupMenuOpen || isGroupMenuTransitionSource
                      ? `document-group:${representativeMessage?.id ?? 'unknown'}`
                      : (activeAttachmentMenuMessageId ?? 'unknown')
                  }
                  shouldAnimateMenuOpen={shouldAnimateMenuOpen}
                  menuPlacement={menuPlacement}
                  menuOffsetX={menuOffsetX}
                  sidePlacementClass={sidePlacementClass}
                  sideArrowAnchorClass={sideArrowAnchorClass}
                  actions={
                    isGroupMenuOpen || isGroupMenuTransitionSource
                      ? groupMenuActions
                      : (attachmentRows.find(
                          attachmentRow =>
                            attachmentRow.message.id ===
                            activeAttachmentMenuMessageId
                        )?.menuActions ?? [])
                  }
                />
              </div>
            </div>,
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

      <div className="h-1" />
    </div>
  );
};
