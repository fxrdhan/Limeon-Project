import type {
  ChatHeaderModel,
  ComposerPanelModel,
  MessagesPaneModel,
} from './models';

export const buildChatHeaderModel = (
  model: ChatHeaderModel
): ChatHeaderModel => ({
  ...model,
  activeSearchResultIndex: Math.max(model.activeSearchResultIndex, 0),
});

export const buildMessagesPaneModel = (
  model: MessagesPaneModel
): MessagesPaneModel => model;

export const buildComposerPanelModel = (
  model: ComposerPanelModel
): ComposerPanelModel => model;
