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
import { MessageDocumentAttachmentGroupContent } from './MessageDocumentAttachmentGroupContent';
import { MessageImageAttachmentGroupContent } from './MessageImageAttachmentGroupContent';
import { getMessageMenuClasses } from './messageItemUtils';
import { areMessageItemPropsEqual } from './messageItemMemo';
import { buildMessageItemDerivations } from './messageItemDerivations';

export interface MessageItemLayoutModel {
  isGroupedWithPrevious: boolean;
  isGroupedWithNext: boolean;
  isFirstVisibleMessage: boolean;
  hasDateSeparatorBefore?: boolean;
}

export interface MessageItemInteractionModel {
  userId?: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  maxMessageChars: number;
  onToggleMessageSelection: (messageId: string) => void;
  handleToggleExpand: (messageId: string) => void;
}

export interface MessageItemMenuModel {
  openMessageId: string | null;
  placement: MenuPlacement;
  sideAnchor: MenuSideAnchor;
  shouldAnimateOpen: boolean;
  transitionSourceId: string | null;
  offsetX: number;
  toggle: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
}

export interface MessageItemRefsModel {
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

export interface MessageItemContentModel {
  resolvedMessageUrl: string | null;
  captionMessage?: ChatMessage;
  groupedDocumentMessages?: ChatMessage[];
  groupedImageMessages?: ChatMessage[];
  pdfMessagePreview?: PdfMessagePreview;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  getImageMessageUrl: (
    message: Pick<
      ChatMessage,
      | 'id'
      | 'message'
      | 'message_type'
      | 'file_name'
      | 'file_mime_type'
      | 'file_preview_url'
    >
  ) => string | null;
  getPdfMessagePreview: (
    message: ChatMessage,
    fileName: string | null
  ) => PdfMessagePreview | undefined;
  normalizedSearchQuery: string;
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
  openImageGroupInPortal: (
    messages: Array<
      Pick<
        ChatMessage,
        | 'id'
        | 'message'
        | 'file_storage_path'
        | 'file_mime_type'
        | 'file_name'
        | 'file_preview_url'
      > & {
        previewUrl?: string | null;
      }
    >,
    initialMessageId?: string | null,
    initialPreviewUrl?: string | null,
    initialPreviewIntrinsicDimensions?: {
      width: number;
      height: number;
    } | null
  ) => Promise<void>;
  openDocumentInPortal: (
    message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
}

export interface MessageItemActionsModel {
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

export interface MessageItemModel {
  message: ChatMessage;
  layout: MessageItemLayoutModel;
  interaction: MessageItemInteractionModel;
  menu: MessageItemMenuModel;
  refs: MessageItemRefsModel;
  content: MessageItemContentModel;
  actions: MessageItemActionsModel;
}

const MessageItemComponent = ({ model }: { model: MessageItemModel }) => {
  const { message, layout, interaction, menu, refs, content, actions } = model;
  const {
    isGroupedWithPrevious,
    isGroupedWithNext,
    isFirstVisibleMessage,
    hasDateSeparatorBefore,
  } = layout;
  const {
    userId,
    isSelectionMode,
    isSelected,
    expandedMessageIds,
    flashingMessageId,
    isFlashHighlightVisible,
    searchMatchedMessageIds,
    activeSearchMessageId,
    maxMessageChars,
    onToggleMessageSelection,
    handleToggleExpand,
  } = interaction;
  const {
    openMessageId,
    placement,
    sideAnchor,
    shouldAnimateOpen,
    transitionSourceId,
    offsetX,
    toggle,
  } = menu;
  const {
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
  } = refs;
  const {
    resolvedMessageUrl,
    captionMessage,
    groupedDocumentMessages,
    groupedImageMessages,
    pdfMessagePreview,
    getAttachmentFileName,
    getAttachmentFileKind,
    getImageMessageUrl,
    getPdfMessagePreview,
    normalizedSearchQuery,
    openImageInPortal,
    openImageGroupInPortal,
    openDocumentInPortal,
  } = content;
  const {
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleOpenForwardMessagePicker,
    handleDeleteMessage,
  } = actions;
  const isDocumentAttachmentGroup = (groupedDocumentMessages?.length ?? 0) > 1;
  const isImageAttachmentGroup = (groupedImageMessages?.length ?? 0) > 1;
  const isAttachmentGroup = isDocumentAttachmentGroup || isImageAttachmentGroup;
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
    openMenuMessageId: openMessageId,
    menuTransitionSourceId: transitionSourceId,
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
    placement,
    sideAnchor
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
  const bubbleMessageIds = groupedDocumentMessages?.length
    ? groupedDocumentMessages.map(messageItem => messageItem.id)
    : groupedImageMessages?.length
      ? groupedImageMessages.map(messageItem => messageItem.id)
      : [message.id];
  const bubbleSharedProps = {
    ref: (bubbleElement: HTMLDivElement | null) => {
      bubbleMessageIds.forEach(messageId => {
        if (bubbleElement) {
          messageBubbleRefs.current.set(messageId, bubbleElement);
        } else {
          messageBubbleRefs.current.delete(messageId);
        }
      });
    },
    className: `${bubbleWrapperClass} max-w-full ${bubbleSpacingClass} ${bubbleTypographyClass} ${bubbleToneClass} ${bubbleOpacityClass} ${
      bubbleShapeClass
    } ${
      isActiveSearchMatch
        ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
        : isSearchMatch
          ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.08)]'
          : ''
    } ${
      isAttachmentGroup ? 'cursor-pointer overflow-visible' : 'cursor-pointer'
    } select-none transition-[background-color,color,opacity,box-shadow] duration-300 ease-in-out`,
    style: {
      overflowWrap:
        !isImageMessage && !isFileMessage ? ('anywhere' as const) : undefined,
      wordBreak:
        !isImageMessage && !isFileMessage ? ('break-word' as const) : undefined,
    },
  };
  const bubbleInnerContent = (
    <>
      <MessageBubbleMeta
        isCurrentUser={isCurrentUser}
        displayTime={displayTime}
        isEdited={isEdited}
        messageDeliveryStatus={messageDeliveryStatus}
      />
      {isImageAttachmentGroup && groupedImageMessages ? (
        <MessageImageAttachmentGroupContent
          messages={groupedImageMessages}
          userId={userId}
          captionMessage={captionMessage}
          isSelectionMode={isSelectionMode}
          isHighlightedBubble={isFlashingTarget}
          openMenuMessageId={openMessageId}
          menuPlacement={placement}
          menuSideAnchor={sideAnchor}
          menuOffsetX={offsetX}
          shouldAnimateMenuOpen={shouldAnimateOpen}
          toggleMessageMenu={toggle}
          getImageMessageUrl={getImageMessageUrl}
          openImageGroupInPortal={openImageGroupInPortal}
          handleCopyMessage={handleCopyMessage}
          handleDownloadMessage={handleDownloadMessage}
          handleOpenForwardMessagePicker={handleOpenForwardMessagePicker}
          handleDeleteMessage={handleDeleteMessage}
        />
      ) : isDocumentAttachmentGroup && groupedDocumentMessages ? (
        <MessageDocumentAttachmentGroupContent
          messages={groupedDocumentMessages}
          userId={userId}
          captionMessage={captionMessage}
          isHighlightedBubble={isFlashingTarget}
          openMenuMessageId={openMessageId}
          menuPlacement={placement}
          menuSideAnchor={sideAnchor}
          menuOffsetX={offsetX}
          shouldAnimateMenuOpen={shouldAnimateOpen}
          toggleMessageMenu={toggle}
          getAttachmentFileName={getAttachmentFileName}
          getPdfMessagePreview={getPdfMessagePreview}
          openImageInPortal={openImageInPortal}
          openDocumentInPortal={openDocumentInPortal}
          handleCopyMessage={handleCopyMessage}
          handleDownloadMessage={handleDownloadMessage}
          handleOpenForwardMessagePicker={handleOpenForwardMessagePicker}
          handleDeleteMessage={handleDeleteMessage}
        />
      ) : (
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
      )}
    </>
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
      } ${rowSpacingClass} ${
        isMenuOpen ? 'z-10' : isMenuTransitionSource ? 'z-[9]' : 'z-0'
      } ${
        !isSelectionMode &&
        openMessageId &&
        !bubbleMessageIds.includes(openMessageId)
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
          {isAttachmentGroup ? (
            <div {...bubbleSharedProps}>{bubbleInnerContent}</div>
          ) : (
            <div
              {...bubbleSharedProps}
              onClick={event => {
                if (isSelectionMode) return;
                event.stopPropagation();
                toggle(
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
                  toggle(
                    event.currentTarget,
                    message.id,
                    isCurrentUser ? 'left' : 'right'
                  );
                }
              }}
            >
              {bubbleInnerContent}
            </div>
          )}

          {isAttachmentGroup ? null : (
            <MessageActionPopover
              isOpen={!isSelectionMode && isMenuOpen}
              menuId={message.id}
              shouldAnimateMenuOpen={shouldAnimateOpen}
              menuPlacement={placement}
              menuOffsetX={offsetX}
              sidePlacementClass={sidePlacementClass}
              sideArrowAnchorClass={sideArrowAnchorClass}
              actions={menuActions}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MessageItem = memo(MessageItemComponent, areMessageItemPropsEqual);

MessageItem.displayName = 'MessageItem';

export default MessageItem;
