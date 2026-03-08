import type { MessageItemModel } from './MessageItem';

const isMenuOpenForMessage = (model: MessageItemModel) =>
  model.openMenuMessageId === model.message.id;

const isMenuTransitionSourceForMessage = (model: MessageItemModel) =>
  model.menuTransitionSourceId === model.message.id;

const isFlashingMessage = (model: MessageItemModel) =>
  model.flashingMessageId === model.message.id;

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
  const previousHasOpenMenu = Boolean(previousModel.openMenuMessageId);
  const nextHasOpenMenu = Boolean(nextModel.openMenuMessageId);
  const previousFlashingMessage = isFlashingMessage(previousModel);
  const nextFlashingMessage = isFlashingMessage(nextModel);

  return (
    previousModel.message === nextModel.message &&
    previousModel.resolvedMessageUrl === nextModel.resolvedMessageUrl &&
    previousModel.userId === nextModel.userId &&
    previousModel.isSelectionMode === nextModel.isSelectionMode &&
    previousModel.isSelected === nextModel.isSelected &&
    previousHasOpenMenu === nextHasOpenMenu &&
    previousMenuOpen === nextMenuOpen &&
    previousMenuTransitionSource === nextMenuTransitionSource &&
    previousModel.menuPlacement === nextModel.menuPlacement &&
    previousModel.menuSideAnchor === nextModel.menuSideAnchor &&
    previousModel.shouldAnimateMenuOpen === nextModel.shouldAnimateMenuOpen &&
    previousModel.menuOffsetX === nextModel.menuOffsetX &&
    previousModel.expandedMessageIds.has(messageId) ===
      nextModel.expandedMessageIds.has(messageId) &&
    previousFlashingMessage === nextFlashingMessage &&
    previousModel.isFlashHighlightVisible ===
      nextModel.isFlashHighlightVisible &&
    previousModel.searchMatchedMessageIds.has(messageId) ===
      nextModel.searchMatchedMessageIds.has(messageId) &&
    (previousModel.activeSearchMessageId === messageId) ===
      (nextModel.activeSearchMessageId === messageId) &&
    previousModel.maxMessageChars === nextModel.maxMessageChars &&
    previousModel.captionMessage === nextModel.captionMessage &&
    previousModel.normalizedSearchQuery === nextModel.normalizedSearchQuery &&
    previousModel.pdfMessagePreview?.coverDataUrl ===
      nextModel.pdfMessagePreview?.coverDataUrl &&
    previousModel.pdfMessagePreview?.pageCount ===
      nextModel.pdfMessagePreview?.pageCount
  );
};
