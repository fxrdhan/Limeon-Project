import { motion } from 'motion/react';
import { memo } from 'react';
import { areMessageItemPropsEqual } from './messageItemMemo';
import { MessageItemBubble } from './MessageItemBubble';
import { buildMessageItemDerivations } from './messageItemDerivations';
import type { MessageItemModel } from './messageItemTypes';
export type {
  MessageItemActionsModel,
  MessageItemContentModel,
  MessageItemInteractionModel,
  MessageItemLayoutModel,
  MessageItemMenuModel,
  MessageItemModel,
  MessageItemRefsModel,
} from './messageItemTypes';

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
  } = interaction;
  const { openMessageId, transitionSourceId } = menu;
  const { initialMessageAnimationKeysRef, initialOpenJumpAnimationKeysRef } =
    refs;
  const {
    resolvedMessageUrl,
    captionMessage,
    groupedDocumentMessages,
    groupedImageMessages,
    pdfMessagePreview,
    getAttachmentFileName,
    getAttachmentFileKind,
    normalizedSearchQuery,
    openImageInPortal,
    openDocumentInPortal,
  } = content;
  const {
    handleEditMessage,
    handleReplyMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleOpenForwardMessagePicker,
    handleDeleteMessage,
  } = actions;
  const derivations = buildMessageItemDerivations({
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
    handleReplyMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleOpenForwardMessagePicker,
    handleDeleteMessage,
  });
  const { isCurrentUser, isMenuOpen, isMenuTransitionSource } = derivations;
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
  const bubbleMessageIds =
    groupedDocumentMessages?.length || groupedImageMessages?.length
      ? (groupedDocumentMessages ?? groupedImageMessages ?? []).map(
          messageItem => messageItem.id
        )
      : [message.id];
  const isAnotherMessageMenuOpen =
    !isSelectionMode &&
    openMessageId !== null &&
    !bubbleMessageIds.includes(openMessageId);

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
        isMenuOpen ? 'z-[181]' : isMenuTransitionSource ? 'z-[180]' : 'z-0'
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
      <MessageItemBubble
        model={model}
        derivations={derivations}
        bubbleShapeClass={bubbleShapeClass}
        shouldDimBubble={isAnotherMessageMenuOpen}
      />
    </motion.div>
  );
};

const MessageItem = memo(MessageItemComponent, areMessageItemPropsEqual);

MessageItem.displayName = 'MessageItem';

export default MessageItem;
