import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { QuotedMessagePreview } from '../QuotedMessagePreview';
import type { MessageItemDerivations } from './messageItemDerivations';
import { MessageActionPopover } from './MessageActionPopover';
import { MessageBubbleContent } from './MessageBubbleContent';
import { MessageBubbleMeta } from './MessageBubbleMeta';
import { MessageDocumentAttachmentGroupContent } from './MessageDocumentAttachmentGroupContent';
import { MessageImageAttachmentGroupContent } from './MessageImageAttachmentGroupContent';
import { getMessageMenuClasses } from './messageItemUtils';
import type { MessageItemModel } from './messageItemTypes';

interface MessageItemBubbleProps {
  model: MessageItemModel;
  derivations: MessageItemDerivations;
  bubbleShapeClass: string;
  shouldDimBubble: boolean;
}

export const MessageItemBubble = ({
  model,
  derivations,
  bubbleShapeClass,
  shouldDimBubble,
}: MessageItemBubbleProps) => {
  const { message, interaction, menu, refs, content, actions } = model;
  const groupedBubbleRef = useRef<HTMLDivElement | null>(null);
  const [groupedMenuPortalElement, setGroupedMenuPortalElement] =
    useState<HTMLDivElement | null>(null);
  const {
    isSelectionMode,
    userId,
    selectionTargetMessageIds,
    onToggleMessageSelection,
    handleToggleExpand,
  } = interaction;
  const {
    openMessageId,
    dimmingMessageId,
    placement,
    sideAnchor,
    verticalAnchor,
    shouldAnimateOpen,
    offsetX,
    toggle,
  } = menu;
  const { messageBubbleRefs } = refs;
  const {
    resolvedMessageUrl,
    captionMessage,
    replyTargetMessage,
    groupedDocumentMessages,
    groupedImageMessages,
    getAttachmentFileName,
    getImageMessageUrl,
    getPdfMessagePreview,
    openImageInPortal,
    openImageGroupInPortal,
    openDocumentInPortal,
    focusReplyTargetMessage,
  } = content;
  const {
    handleCopyMessage,
    handleDeleteMessage,
    handleDeleteMessages,
    handleDownloadMessage,
    handleDownloadImageGroup,
    handleDownloadDocumentGroup,
    handleOpenForwardMessagePicker,
    handleReplyMessage,
  } = actions;
  const {
    displayTime,
    isEdited,
    messageDeliveryStatus,
    isCurrentUser,
    hasReplyPreview,
    replyAuthorLabel,
    replyPreviewText,
    isMenuOpen,
    isMenuTransitionSource,
    hasAttachmentCaption,
    isFlashingTarget,
    isSearchMatch,
    isActiveSearchMatch,
    isImageMessage,
    isFileMessage,
    isImageFileMessage,
    isPdfFileMessage,
    fileName,
    fileSecondaryLabel,
    resolvedPdfPreviewUrl,
    pdfMetaLabel,
    fileIcon,
    bubbleToneClass,
    bubbleOpacityClass,
    bubbleWrapperClass,
    bubbleSpacingClass,
    bubbleTypographyClass,
    highlightedMessage,
    highlightedCaption,
    collapsedSearchSnippet,
    isMessageLong,
    isExpanded,
    menuActions,
  } = derivations;
  const isDocumentAttachmentGroup = (groupedDocumentMessages?.length ?? 0) > 1;
  const isImageAttachmentGroup = (groupedImageMessages?.length ?? 0) > 1;
  const isAttachmentGroup = isDocumentAttachmentGroup || isImageAttachmentGroup;
  const { sidePlacementClass } = getMessageMenuClasses(placement, sideAnchor);
  const bubbleMessageIds = groupedDocumentMessages?.length
    ? groupedDocumentMessages.map(messageItem => messageItem.id)
    : groupedImageMessages?.length
      ? groupedImageMessages.map(messageItem => messageItem.id)
      : [message.id];
  const disableTextLinks =
    !isSelectionMode &&
    dimmingMessageId !== null &&
    !bubbleMessageIds.includes(dimmingMessageId);
  const disableReplyPanelInteraction =
    isSelectionMode || dimmingMessageId !== null;
  const bubbleStyle: CSSProperties = {
    overflowWrap:
      !isImageMessage && !isFileMessage ? ('anywhere' as const) : undefined,
    wordBreak:
      !isImageMessage && !isFileMessage ? ('break-word' as const) : undefined,
  };
  const isReplyPanelInteractive =
    !disableReplyPanelInteraction &&
    Boolean(replyTargetMessage?.id) &&
    hasReplyPreview;
  const isReplyTargetCurrentUser = replyTargetMessage?.sender_id === userId;
  const shouldUseIndependentReplyPanelPadding =
    hasReplyPreview && !isImageMessage && !isFileMessage && !isAttachmentGroup;

  const activateReplyPanel = (
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>
  ) => {
    if (!replyTargetMessage?.id) {
      return;
    }

    event.stopPropagation();
    focusReplyTargetMessage(replyTargetMessage.id);
  };

  const replyPanelContainerClassName = shouldUseIndependentReplyPanelPadding
    ? 'px-1 pt-1 pb-1'
    : 'mb-2';

  const bubbleInnerContent = (
    <>
      <MessageBubbleMeta
        isCurrentUser={isCurrentUser}
        displayTime={displayTime}
        isEdited={isEdited}
        messageDeliveryStatus={messageDeliveryStatus}
      />
      {hasReplyPreview ? (
        <div className={replyPanelContainerClassName}>
          <QuotedMessagePreview
            authorLabel={replyAuthorLabel ?? ''}
            previewText={replyPreviewText ?? ''}
            isAuthorCurrentUser={isReplyTargetCurrentUser}
            isHighlighted={isFlashingTarget}
            surface={
              isCurrentUser ? 'current-user-message' : 'other-user-message'
            }
            ariaLabel={`Buka pesan yang dibalas dari ${replyAuthorLabel}`}
            onActivate={
              isReplyPanelInteractive ? activateReplyPanel : undefined
            }
          />
        </div>
      ) : null}
      {isImageAttachmentGroup && groupedImageMessages ? (
        <MessageImageAttachmentGroupContent
          messages={groupedImageMessages}
          menuAnchorRef={groupedBubbleRef}
          menuPortalContainer={groupedMenuPortalElement}
          userId={userId}
          captionMessage={captionMessage}
          isSelectionMode={isSelectionMode}
          isHighlightedBubble={isFlashingTarget}
          openMenuMessageId={openMessageId}
          menuTransitionSourceId={menu.transitionSourceId}
          menuPlacement={placement}
          menuSideAnchor={sideAnchor}
          menuVerticalAnchor={verticalAnchor}
          menuOffsetX={offsetX}
          shouldAnimateMenuOpen={shouldAnimateOpen}
          toggleMessageMenu={toggle}
          getImageMessageUrl={getImageMessageUrl}
          openImageGroupInPortal={openImageGroupInPortal}
          handleCopyMessage={handleCopyMessage}
          handleDownloadMessage={handleDownloadMessage}
          handleDownloadImageGroup={handleDownloadImageGroup}
          handleDeleteMessages={handleDeleteMessages}
          handleOpenForwardMessagePicker={handleOpenForwardMessagePicker}
          handleDeleteMessage={handleDeleteMessage}
          handleReplyMessage={handleReplyMessage}
        />
      ) : isDocumentAttachmentGroup && groupedDocumentMessages ? (
        <MessageDocumentAttachmentGroupContent
          messages={groupedDocumentMessages}
          menuAnchorRef={groupedBubbleRef}
          userId={userId}
          captionMessage={captionMessage}
          isHighlightedBubble={isFlashingTarget}
          openMenuMessageId={openMessageId}
          menuTransitionSourceId={menu.transitionSourceId}
          menuPlacement={placement}
          menuSideAnchor={sideAnchor}
          menuVerticalAnchor={verticalAnchor}
          menuOffsetX={offsetX}
          shouldAnimateMenuOpen={shouldAnimateOpen}
          toggleMessageMenu={toggle}
          getAttachmentFileName={getAttachmentFileName}
          getPdfMessagePreview={getPdfMessagePreview}
          openImageInPortal={openImageInPortal}
          openDocumentInPortal={openDocumentInPortal}
          handleCopyMessage={handleCopyMessage}
          handleDownloadMessage={handleDownloadMessage}
          handleDownloadDocumentGroup={handleDownloadDocumentGroup}
          handleDeleteMessages={handleDeleteMessages}
          handleOpenForwardMessagePicker={handleOpenForwardMessagePicker}
          handleDeleteMessage={handleDeleteMessage}
          handleReplyMessage={handleReplyMessage}
        />
      ) : (
        <div
          className={
            shouldUseIndependentReplyPanelPadding ? 'px-3 pt-0 pb-2' : ''
          }
        >
          <MessageBubbleContent
            message={message}
            isCurrentUser={isCurrentUser}
            messageDeliveryStatus={messageDeliveryStatus}
            resolvedMessageUrl={resolvedMessageUrl}
            isSelectionMode={isSelectionMode}
            disableTextLinks={disableTextLinks}
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
      )}
    </>
  );

  const bubbleClassName = `${bubbleWrapperClass} max-w-full ${
    shouldUseIndependentReplyPanelPadding ? 'p-0' : bubbleSpacingClass
  } ${bubbleTypographyClass} ${bubbleToneClass} ${bubbleOpacityClass} ${bubbleShapeClass} ${
    isActiveSearchMatch
      ? '!shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
      : isSearchMatch
        ? '!shadow-[0_0_0_1px_rgba(15,23,42,0.08)]'
        : ''
  } shadow-surface-thin ${isAttachmentGroup ? 'cursor-pointer overflow-visible' : 'cursor-pointer'} ${
    shouldDimBubble ? 'blur-[2px] brightness-95' : ''
  } select-none transition-[background-color,color,opacity,box-shadow,filter] duration-300 ease-in-out`;

  return (
    <div
      className={
        isCurrentUser
          ? 'relative flex min-w-0 max-w-xs flex-col items-end'
          : 'relative flex min-w-0 max-w-xs flex-col items-start'
      }
    >
      <div
        className={
          isFileMessage && !isImageFileMessage
            ? 'relative min-w-0 w-full max-w-full'
            : 'relative min-w-0 max-w-full'
        }
      >
        {isAttachmentGroup ? (
          <div
            ref={bubbleElement => {
              bubbleMessageIds.forEach(messageId => {
                if (bubbleElement) {
                  messageBubbleRefs.current.set(messageId, bubbleElement);
                } else {
                  messageBubbleRefs.current.delete(messageId);
                }
              });
              groupedBubbleRef.current = bubbleElement;
            }}
            className={bubbleClassName}
            style={bubbleStyle}
            onClick={event => {
              if (isSelectionMode) return;
              if (
                !(
                  event.target instanceof Element &&
                  event.target.closest('[data-chat-quoted-message-preview]')
                )
              ) {
                return;
              }
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
                  onToggleMessageSelection(selectionTargetMessageIds);
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
        ) : (
          <div
            ref={bubbleElement => {
              bubbleMessageIds.forEach(messageId => {
                if (bubbleElement) {
                  messageBubbleRefs.current.set(messageId, bubbleElement);
                } else {
                  messageBubbleRefs.current.delete(messageId);
                }
              });
            }}
            className={bubbleClassName}
            style={bubbleStyle}
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
                  onToggleMessageSelection(selectionTargetMessageIds);
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

        {isImageAttachmentGroup ? (
          <div
            ref={setGroupedMenuPortalElement}
            className="pointer-events-none absolute inset-0"
          />
        ) : null}

        {isAttachmentGroup ? null : (
          <MessageActionPopover
            isOpen={!isSelectionMode && (isMenuOpen || isMenuTransitionSource)}
            menuId={message.id}
            shouldAnimateMenuOpen={shouldAnimateOpen}
            menuPlacement={placement}
            menuOffsetX={offsetX}
            sidePlacementClass={sidePlacementClass}
            menuVerticalAnchor={verticalAnchor}
            actions={menuActions}
          />
        )}
      </div>
    </div>
  );
};
