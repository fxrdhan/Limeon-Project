import { motion } from 'motion/react';
import { memo } from 'react';
import { TbCheck } from 'react-icons/tb';
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

const MessageItem = memo(MessageItemComponent, areMessageItemPropsEqual);

MessageItem.displayName = 'MessageItem';

export default MessageItem;
