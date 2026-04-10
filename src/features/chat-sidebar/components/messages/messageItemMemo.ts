import type { MessageItemModel } from './messageItemTypes';
import { getPdfMessagePreviewUrl } from '../../utils/pdf-message-preview';

const isMenuOpenForMessage = (model: MessageItemModel) =>
  model.menu.openMessageId === model.message.id;

const isMenuTransitionSourceForMessage = (model: MessageItemModel) =>
  model.menu.transitionSourceId === model.message.id;

const isFlashingMessage = (model: MessageItemModel) =>
  model.interaction.flashingMessageId === model.message.id;

export const areMessageItemPropsEqual = (
  previousProps: { model: MessageItemModel },
  nextProps: { model: MessageItemModel }
) => {
  const previousModel = previousProps.model;
  const nextModel = nextProps.model;
  const messageId = previousModel.message.id;

  if (messageId !== nextModel.message.id) {
    return false;
  }

  const previousMenuOpen = isMenuOpenForMessage(previousModel);
  const nextMenuOpen = isMenuOpenForMessage(nextModel);
  const previousMenuTransitionSource =
    isMenuTransitionSourceForMessage(previousModel);
  const nextMenuTransitionSource = isMenuTransitionSourceForMessage(nextModel);
  const previousHasOpenMenu = Boolean(previousModel.menu.openMessageId);
  const nextHasOpenMenu = Boolean(nextModel.menu.openMessageId);
  const previousFlashingMessage = isFlashingMessage(previousModel);
  const nextFlashingMessage = isFlashingMessage(nextModel);

  return (
    previousModel.message === nextModel.message &&
    previousModel.content.resolvedMessageUrl ===
      nextModel.content.resolvedMessageUrl &&
    previousModel.interaction.userId === nextModel.interaction.userId &&
    previousModel.layout.isGroupedWithPrevious ===
      nextModel.layout.isGroupedWithPrevious &&
    previousModel.layout.isGroupedWithNext ===
      nextModel.layout.isGroupedWithNext &&
    previousModel.layout.isFirstVisibleMessage ===
      nextModel.layout.isFirstVisibleMessage &&
    previousModel.layout.hasDateSeparatorBefore ===
      nextModel.layout.hasDateSeparatorBefore &&
    previousModel.interaction.isSelectionMode ===
      nextModel.interaction.isSelectionMode &&
    previousModel.interaction.isSelected === nextModel.interaction.isSelected &&
    previousHasOpenMenu === nextHasOpenMenu &&
    previousMenuOpen === nextMenuOpen &&
    previousMenuTransitionSource === nextMenuTransitionSource &&
    previousModel.menu.placement === nextModel.menu.placement &&
    previousModel.menu.sideAnchor === nextModel.menu.sideAnchor &&
    previousModel.menu.verticalAnchor === nextModel.menu.verticalAnchor &&
    previousModel.menu.shouldAnimateOpen === nextModel.menu.shouldAnimateOpen &&
    previousModel.menu.offsetX === nextModel.menu.offsetX &&
    previousModel.interaction.expandedMessageIds.has(messageId) ===
      nextModel.interaction.expandedMessageIds.has(messageId) &&
    previousFlashingMessage === nextFlashingMessage &&
    previousModel.interaction.isFlashHighlightVisible ===
      nextModel.interaction.isFlashHighlightVisible &&
    previousModel.interaction.searchMatchedMessageIds.has(messageId) ===
      nextModel.interaction.searchMatchedMessageIds.has(messageId) &&
    (previousModel.interaction.activeSearchMessageId === messageId) ===
      (nextModel.interaction.activeSearchMessageId === messageId) &&
    previousModel.interaction.maxMessageChars ===
      nextModel.interaction.maxMessageChars &&
    previousModel.content.captionMessage === nextModel.content.captionMessage &&
    previousModel.content.replyTargetMessage ===
      nextModel.content.replyTargetMessage &&
    previousModel.content.groupedDocumentMessages ===
      nextModel.content.groupedDocumentMessages &&
    previousModel.content.groupedImageMessages ===
      nextModel.content.groupedImageMessages &&
    previousModel.content.normalizedSearchQuery ===
      nextModel.content.normalizedSearchQuery &&
    getPdfMessagePreviewUrl(previousModel.content.pdfMessagePreview) ===
      getPdfMessagePreviewUrl(nextModel.content.pdfMessagePreview) &&
    previousModel.content.pdfMessagePreview?.pageCount ===
      nextModel.content.pdfMessagePreview?.pageCount
  );
};
