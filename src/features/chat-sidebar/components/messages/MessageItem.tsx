import { motion } from 'motion/react';
import { memo } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../../types';
import { MessageActionPopover } from './MessageActionPopover';
import { MessageBubbleContent } from './MessageBubbleContent';
import { MessageBubbleMeta } from './MessageBubbleMeta';
import { getMessageMenuClasses } from './messageItemUtils';
import { areMessageItemPropsEqual } from './messageItemMemo';
import { buildMessageItemDerivations } from './messageItemDerivations';

export interface MessageItemModel {
  message: ChatMessage;
  resolvedMessageUrl: string | null;
  userId?: string;
  isGroupedWithPrevious: boolean;
  isGroupedWithNext: boolean;
  isFirstVisibleMessage: boolean;
  hasDateSeparatorBefore?: boolean;
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
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  normalizedSearchQuery: string;
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
}

const MessageItemComponent = ({ model }: { model: MessageItemModel }) => {
  const {
    message,
    resolvedMessageUrl,
    userId,
    isGroupedWithPrevious,
    isGroupedWithNext,
    isFirstVisibleMessage,
    hasDateSeparatorBefore,
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
    handleOpenForwardMessagePicker,
    handleDeleteMessage,
    getAttachmentFileName,
    getAttachmentFileKind,
    normalizedSearchQuery,
    openImageInPortal,
    openDocumentInPortal,
  } = model;
  const {
    isCurrentUser,
    hasAttachmentCaption,
    displayTime,
    isEdited,
    messageDeliveryStatus,
    isMenuOpen,
    isMenuTransitionSource,
    isFlashingTarget,
    isSearchMatch,
    isActiveSearchMatch,
    isImageMessage,
    isFileMessage,
    isImageFileMessage,
    fileName,
    fileSecondaryLabel,
    isPdfFileMessage,
    resolvedPdfPreviewUrl,
    pdfMetaLabel,
    fileIcon,
    bubbleToneClass,
    bubbleOpacityClass,
    isExpanded,
    isMessageLong,
    bubbleWrapperClass,
    bubbleSpacingClass,
    bubbleTypographyClass,
    collapsedSearchSnippet,
    highlightedMessage,
    highlightedCaption,
    menuActions,
  } = buildMessageItemDerivations({
    message,
    resolvedMessageUrl,
    userId,
    openMenuMessageId,
    menuTransitionSourceId,
    flashingMessageId,
    isFlashHighlightVisible,
    searchMatchedMessageIds,
    activeSearchMessageId,
    expandedMessageIds,
    maxMessageChars,
    captionMessage,
    pdfMessagePreview,
    getAttachmentFileName,
    getAttachmentFileKind,
    normalizedSearchQuery,
    openImageInPortal,
    openDocumentInPortal,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleOpenForwardMessagePicker,
    handleDeleteMessage,
  });
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
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    menuPlacement,
    menuSideAnchor
  );
  const rowSpacingClass =
    isFirstVisibleMessage || hasDateSeparatorBefore
      ? ''
      : isGroupedWithPrevious
        ? 'mt-1'
        : 'mt-3';
  const outgoingTopCornerClass = isGroupedWithPrevious
    ? 'rounded-tr-md'
    : 'rounded-tr-[2px]';
  const outgoingBottomCornerClass = isGroupedWithNext
    ? 'rounded-br-md'
    : 'rounded-br-xl';
  const incomingTopCornerClass = isGroupedWithPrevious
    ? 'rounded-tl-xl'
    : 'rounded-tl-[2px]';
  const incomingBottomCornerClass = isGroupedWithNext
    ? 'rounded-bl-md'
    : 'rounded-bl-xl';
  const bubbleShapeClass = isCurrentUser
    ? `rounded-tl-xl rounded-bl-xl ${outgoingTopCornerClass} ${outgoingBottomCornerClass}`
    : `rounded-tr-xl rounded-br-xl ${incomingTopCornerClass} ${incomingBottomCornerClass}`;

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
      } ${rowSpacingClass} ${
        isMenuOpen ? 'z-10' : isMenuTransitionSource ? 'z-[9]' : 'z-0'
      } ${
        !isSelectionMode &&
        openMenuMessageId &&
        openMenuMessageId !== message.id
          ? 'blur-[2px] brightness-95'
          : ''
      } ${isSelectionMode ? 'group cursor-pointer' : ''}`}
      onClick={() => {
        if (!isSelectionMode) return;
        onToggleMessageSelection(message.id);
      }}
    >
      {isSelectionMode ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 -inset-x-3 rounded-xl transition-colors duration-200 ease-out ${
            isSelected
              ? 'bg-slate-200'
              : 'bg-transparent group-hover:bg-slate-100'
          }`}
        />
      ) : null}
      <div
        className={`${
          isCurrentUser
            ? 'relative z-[1] flex min-w-0 max-w-xs flex-col items-end'
            : 'relative z-[1] flex min-w-0 max-w-xs flex-col items-start'
        }`}
      >
        <div
          className={
            isFileMessage && !isImageFileMessage
              ? 'relative min-w-0 w-full max-w-full'
              : 'relative min-w-0 max-w-full'
          }
        >
          <div
            ref={bubbleElement => {
              if (bubbleElement) {
                messageBubbleRefs.current.set(message.id, bubbleElement);
              } else {
                messageBubbleRefs.current.delete(message.id);
              }
            }}
            className={`${bubbleWrapperClass} max-w-full ${bubbleSpacingClass} ${bubbleTypographyClass} ${bubbleToneClass} ${bubbleOpacityClass} ${
              bubbleShapeClass
            } ${
              isActiveSearchMatch
                ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
                : isSearchMatch
                  ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.08)]'
                  : ''
            } cursor-pointer select-none transition-[background-color,color,opacity,box-shadow] duration-300 ease-in-out`}
            style={{
              overflowWrap:
                !isImageMessage && !isFileMessage ? 'anywhere' : undefined,
              wordBreak:
                !isImageMessage && !isFileMessage ? 'break-word' : undefined,
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
              resolvedMessageUrl={resolvedMessageUrl}
              isSelectionMode={isSelectionMode}
              isImageMessage={isImageMessage}
              isFileMessage={isFileMessage}
              isImageFileMessage={isImageFileMessage}
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
              isHighlightedBubble={isFlashingTarget}
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

const MessageItem = memo(MessageItemComponent, areMessageItemPropsEqual);

MessageItem.displayName = 'MessageItem';

export default MessageItem;
