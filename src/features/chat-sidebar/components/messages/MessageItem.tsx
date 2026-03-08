import { motion } from 'motion/react';
import { TbCheck } from 'react-icons/tb';
import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../../types';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../../utils/message-file';
import {
  buildCollapsedSearchSnippet,
  renderHighlightedText,
} from '../../utils/message-search';
import { MessageActionPopover } from './MessageActionPopover';
import { MessageBubbleContent } from './MessageBubbleContent';
import {
  MessageBubbleMeta,
  type MessageDeliveryStatus,
} from './MessageBubbleMeta';
import {
  buildMessageMenuActions,
  getFileIcon,
  getMessageMenuClasses,
} from './messageItemUtils';

export interface MessageItemModel {
  message: ChatMessage;
  userId?: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  openMenuMessageId: string | null;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  maxMessageChars: number;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  captionMessage?: ChatMessage;
  pdfMessagePreview?: PdfMessagePreview;
  onToggleMessageSelection: (messageId: string) => void;
  toggleMessageMenu: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
  handleToggleExpand: (messageId: string) => void;
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  normalizedSearchQuery: string;
  openImageInPortal: (url: string, previewName: string) => void;
  openDocumentInPortal: (
    url: string,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
}

const MessageItem = ({ model }: { model: MessageItemModel }) => {
  const {
    message,
    userId,
    isSelectionMode,
    isSelected,
    openMenuMessageId,
    menuPlacement,
    menuSideAnchor,
    shouldAnimateMenuOpen,
    menuTransitionSourceId,
    menuOffsetX,
    expandedMessageIds,
    flashingMessageId,
    isFlashHighlightVisible,
    searchMatchedMessageIds,
    activeSearchMessageId,
    maxMessageChars,
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    captionMessage,
    pdfMessagePreview,
    onToggleMessageSelection,
    toggleMessageMenu,
    handleToggleExpand,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleDeleteMessage,
    getAttachmentFileName,
    getAttachmentFileKind,
    normalizedSearchQuery,
    openImageInPortal,
    openDocumentInPortal,
  } = model;
  const isCurrentUser = message.sender_id === userId;
  const attachmentCaptionText = captionMessage?.message?.trim() ?? '';
  const hasAttachmentCaption =
    (message.message_type === 'image' || message.message_type === 'file') &&
    attachmentCaptionText.length > 0;
  const displayTime = new Date(message.created_at).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const createdTimestamp = new Date(message.created_at).getTime();
  const updatedTimestamp = new Date(message.updated_at).getTime();
  const isTextMessage = message.message_type === 'text';
  const isEdited =
    isTextMessage &&
    Number.isFinite(createdTimestamp) &&
    Number.isFinite(updatedTimestamp) &&
    updatedTimestamp > createdTimestamp;
  const messageDeliveryStatus: MessageDeliveryStatus | null = isCurrentUser
    ? message.id.startsWith('temp_')
      ? 'sending'
      : message.is_read
        ? 'read'
        : message.is_delivered
          ? 'delivered'
          : 'sent'
    : null;
  const isMenuOpen = openMenuMessageId === message.id;
  const isMenuTransitionSource = menuTransitionSourceId === message.id;
  const isFlashSequenceTarget = flashingMessageId === message.id;
  const isFlashingTarget = isFlashSequenceTarget && isFlashHighlightVisible;
  const isSearchMatch = searchMatchedMessageIds.has(message.id);
  const isActiveSearchMatch = activeSearchMessageId === message.id;
  const isImageMessage = message.message_type === 'image';
  const isFileMessage = message.message_type === 'file';
  const fileKind = isFileMessage ? getAttachmentFileKind(message) : 'document';
  const isAudioFileMessage = isFileMessage && fileKind === 'audio';
  const fileName = isFileMessage ? getAttachmentFileName(message) : null;
  const fileExtension = isFileMessage
    ? resolveFileExtension(fileName, message.message, message.file_mime_type)
    : '';
  const fileSizeLabel = isFileMessage
    ? formatFileSize(message.file_size)
    : null;
  const fileFallbackLabel = isFileMessage
    ? formatFileFallbackLabel(fileExtension, fileKind)
    : null;
  const fileSecondaryLabel = fileSizeLabel || fileFallbackLabel;
  const isPdfFileMessage =
    isFileMessage &&
    !isAudioFileMessage &&
    (fileExtension === 'pdf' ||
      message.file_mime_type?.toLowerCase().includes('pdf') === true);
  const isImageFileMessage =
    isFileMessage &&
    !isAudioFileMessage &&
    isImageFileExtensionOrMime(fileExtension, message.file_mime_type);
  const persistedPdfPreviewUrl = isPdfFileMessage
    ? message.file_preview_url?.trim() || null
    : null;
  const resolvedPdfPreviewUrl =
    persistedPdfPreviewUrl || pdfMessagePreview?.coverDataUrl || null;
  const resolvedPdfPageCount = isPdfFileMessage
    ? (message.file_preview_page_count ?? pdfMessagePreview?.pageCount)
    : null;
  const pdfMetaLabel = isPdfFileMessage
    ? [
        resolvedPdfPageCount ? `${resolvedPdfPageCount} halaman` : null,
        'PDF',
        fileSizeLabel,
      ]
        .filter(Boolean)
        .join(' · ') || 'PDF'
    : null;
  const fileIcon = getFileIcon(fileExtension, isAudioFileMessage);
  const bubbleToneClass = isFlashingTarget
    ? 'bg-primary text-white'
    : isCurrentUser
      ? 'bg-emerald-200 text-slate-900'
      : 'bg-white text-slate-800';
  const bubbleOpacityClass = isFlashSequenceTarget
    ? isFlashHighlightVisible
      ? 'opacity-100'
      : 'opacity-60'
    : 'opacity-100';
  const animationKey = message.stableKey || message.id;
  const shouldAnimateEnter =
    !initialMessageAnimationKeysRef.current.has(animationKey);
  const shouldAnimateOpenJump =
    !shouldAnimateEnter &&
    initialOpenJumpAnimationKeysRef.current.has(animationKey);
  const targetAnimation = shouldAnimateOpenJump
    ? {
        opacity: 1,
        scale: [1, 1.04, 1],
        x: 0,
        y: [0, -8, 0],
      }
    : { opacity: 1, scale: 1, x: 0, y: 0 };
  const animationTransition = shouldAnimateOpenJump
    ? {
        duration: 0.36,
        ease: [0.22, 1, 0.36, 1] as const,
      }
    : {
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1] as const,
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      };
  const isExpanded = expandedMessageIds.has(message.id);
  const isMessageLong =
    !isImageMessage &&
    !isFileMessage &&
    !isExpanded &&
    message.message.length > maxMessageChars;
  const bubbleWrapperClass = isFileMessage
    ? 'block w-full'
    : isImageMessage
      ? 'inline-flex flex-col align-top'
      : 'inline-block';
  const bubbleSpacingClass = isImageMessage
    ? hasAttachmentCaption
      ? 'px-2 py-2'
      : 'p-0 overflow-hidden'
    : isFileMessage
      ? 'px-2 py-2'
      : 'px-3 py-2';
  const bubbleTypographyClass =
    isImageMessage || isFileMessage
      ? ''
      : 'text-sm whitespace-pre-wrap break-words';
  const collapsedSearchSnippet = buildCollapsedSearchSnippet(
    message.message,
    normalizedSearchQuery,
    maxMessageChars
  );
  const displayMessage = isMessageLong
    ? collapsedSearchSnippet.text
    : message.message;
  const highlightedMessage = renderHighlightedText(
    displayMessage,
    normalizedSearchQuery
  );
  const highlightedCaption = renderHighlightedText(
    attachmentCaptionText,
    normalizedSearchQuery
  );
  const menuActions = buildMessageMenuActions({
    message,
    isCurrentUser,
    isImageMessage,
    isFileMessage,
    isImageFileMessage,
    isPdfFileMessage,
    fileKind,
    fileName,
    openImageInPortal,
    openDocumentInPortal,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleDeleteMessage,
  });
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    menuPlacement,
    menuSideAnchor
  );

  return (
    <motion.div
      key={animationKey}
      initial={
        shouldAnimateEnter
          ? {
              opacity: 0,
              scale: 0.7,
              x: isCurrentUser ? 18 : -18,
              y: 10,
            }
          : false
      }
      animate={targetAnimation}
      style={{
        transformOrigin: isCurrentUser ? 'right bottom' : 'left bottom',
      }}
      transition={animationTransition}
      onAnimationComplete={() => {
        if (shouldAnimateOpenJump) {
          initialOpenJumpAnimationKeysRef.current.delete(animationKey);
        }
      }}
      className={`relative flex w-full ${
        isCurrentUser ? 'justify-end' : 'justify-start'
      } ${isMenuOpen ? 'z-50' : isMenuTransitionSource ? 'z-40' : 'z-0'} ${
        !isSelectionMode &&
        openMenuMessageId &&
        openMenuMessageId !== message.id
          ? 'blur-[2px] brightness-95'
          : ''
      } ${
        isSelectionMode
          ? isSelected
            ? 'cursor-pointer rounded-lg bg-slate-100/75 px-2 py-1'
            : 'cursor-pointer rounded-lg px-2 py-1 hover:bg-slate-100/60'
          : ''
      }`}
      onClick={() => {
        if (!isSelectionMode) return;
        onToggleMessageSelection(message.id);
      }}
    >
      <div
        className={`${
          isCurrentUser
            ? 'flex max-w-xs flex-col items-end'
            : 'flex max-w-xs flex-col items-start'
        }`}
      >
        <div className={isFileMessage ? 'relative w-full' : 'relative'}>
          {isSelectionMode ? (
            <span
              className={`pointer-events-none absolute -top-1.5 ${
                isCurrentUser ? '-left-1.5' : '-right-1.5'
              } z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                isSelected
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}
            >
              {isSelected ? <TbCheck className="h-3.5 w-3.5" /> : null}
            </span>
          ) : null}
          <div
            ref={bubbleElement => {
              if (bubbleElement) {
                messageBubbleRefs.current.set(message.id, bubbleElement);
              } else {
                messageBubbleRefs.current.delete(message.id);
              }
            }}
            className={`${bubbleWrapperClass} max-w-full ${bubbleSpacingClass} ${bubbleTypographyClass} ${bubbleToneClass} ${bubbleOpacityClass} ${
              isCurrentUser
                ? 'rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                : 'rounded-tl-xl rounded-tr-xl rounded-br-xl'
            } ${
              isActiveSearchMatch
                ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
                : isSearchMatch
                  ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.08)]'
                  : ''
            } cursor-pointer select-none transition-[background-color,color,opacity,box-shadow] duration-300 ease-in-out`}
            style={{
              [isCurrentUser
                ? 'borderBottomRightRadius'
                : 'borderBottomLeftRadius']: '2px',
            }}
            onClick={event => {
              if (isSelectionMode) return;
              event.stopPropagation();
              toggleMessageMenu(
                event.currentTarget,
                message.id,
                isCurrentUser ? 'left' : 'right'
              );
            }}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (isSelectionMode) {
                  onToggleMessageSelection(message.id);
                  return;
                }
                toggleMessageMenu(
                  event.currentTarget,
                  message.id,
                  isCurrentUser ? 'left' : 'right'
                );
              }
            }}
          >
            <MessageBubbleMeta
              isCurrentUser={isCurrentUser}
              displayTime={displayTime}
              isEdited={isEdited}
              messageDeliveryStatus={messageDeliveryStatus}
            />
            <MessageBubbleContent
              message={message}
              isImageMessage={isImageMessage}
              isFileMessage={isFileMessage}
              isPdfFileMessage={isPdfFileMessage}
              hasAttachmentCaption={hasAttachmentCaption}
              fileName={fileName}
              fileSecondaryLabel={fileSecondaryLabel}
              fileIcon={fileIcon}
              resolvedPdfPreviewUrl={resolvedPdfPreviewUrl}
              pdfMetaLabel={pdfMetaLabel}
              highlightedMessage={highlightedMessage}
              highlightedCaption={highlightedCaption}
              hasLeadingEllipsis={collapsedSearchSnippet.hasLeadingEllipsis}
              hasTrailingEllipsis={collapsedSearchSnippet.hasTrailingEllipsis}
              isMessageLong={isMessageLong}
              isExpanded={isExpanded}
              isFlashingTarget={isFlashingTarget}
              onToggleExpand={() => handleToggleExpand(message.id)}
            />
          </div>

          <MessageActionPopover
            isOpen={!isSelectionMode && isMenuOpen}
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
    </motion.div>
  );
};

export default MessageItem;
