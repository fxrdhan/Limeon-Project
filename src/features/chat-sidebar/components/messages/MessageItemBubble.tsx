import { useRef, type CSSProperties } from 'react';
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
}

export const MessageItemBubble = ({
  model,
  derivations,
  bubbleShapeClass,
}: MessageItemBubbleProps) => {
  const { message, interaction, menu, refs, content, actions } = model;
  const groupedBubbleRef = useRef<HTMLDivElement | null>(null);
  const {
    isSelectionMode,
    userId,
    onToggleMessageSelection,
    handleToggleExpand,
  } = interaction;
  const {
    openMessageId,
    placement,
    sideAnchor,
    shouldAnimateOpen,
    offsetX,
    toggle,
  } = menu;
  const { messageBubbleRefs } = refs;
  const {
    resolvedMessageUrl,
    captionMessage,
    groupedDocumentMessages,
    groupedImageMessages,
    getAttachmentFileName,
    getImageMessageUrl,
    getPdfMessagePreview,
    openImageInPortal,
    openImageGroupInPortal,
    openDocumentInPortal,
  } = content;
  const {
    handleCopyMessage,
    handleDeleteMessage,
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
    isMenuOpen,
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
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    placement,
    sideAnchor
  );
  const bubbleMessageIds = groupedDocumentMessages?.length
    ? groupedDocumentMessages.map(messageItem => messageItem.id)
    : groupedImageMessages?.length
      ? groupedImageMessages.map(messageItem => messageItem.id)
      : [message.id];
  const disableTextLinks =
    !isSelectionMode &&
    openMessageId !== null &&
    !bubbleMessageIds.includes(openMessageId);
  const bubbleStyle: CSSProperties = {
    overflowWrap:
      !isImageMessage && !isFileMessage ? ('anywhere' as const) : undefined,
    wordBreak:
      !isImageMessage && !isFileMessage ? ('break-word' as const) : undefined,
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
          menuAnchorRef={groupedBubbleRef}
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
          handleDownloadImageGroup={handleDownloadImageGroup}
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
          handleDownloadDocumentGroup={handleDownloadDocumentGroup}
          handleOpenForwardMessagePicker={handleOpenForwardMessagePicker}
          handleDeleteMessage={handleDeleteMessage}
          handleReplyMessage={handleReplyMessage}
        />
      ) : (
        <MessageBubbleContent
          message={message}
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
      )}
    </>
  );

  const bubbleClassName = `${bubbleWrapperClass} max-w-full ${bubbleSpacingClass} ${bubbleTypographyClass} ${bubbleToneClass} ${bubbleOpacityClass} ${
    bubbleShapeClass
  } ${
    isActiveSearchMatch
      ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
      : isSearchMatch
        ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.08)]'
        : ''
  } ${
    isAttachmentGroup ? 'cursor-pointer overflow-visible' : 'cursor-pointer'
  } select-none transition-[background-color,color,opacity,box-shadow] duration-300 ease-in-out`;

  return (
    <div
      className={
        isCurrentUser
          ? 'relative z-[1] flex min-w-0 max-w-xs flex-col items-end'
          : 'relative z-[1] flex min-w-0 max-w-xs flex-col items-start'
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
  );
};
