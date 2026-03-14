import { describe, expect, it } from 'vite-plus/test';
import type { MessageItemModel } from '../components/messages/MessageItem';
import { areMessageItemPropsEqual } from '../components/messages/messageItemMemo';

const baseMessage = {
  id: 'message-1',
  sender_id: 'user-a',
  receiver_id: 'user-b',
  channel_id: 'channel-1',
  message: 'halo',
  message_type: 'text' as const,
  created_at: '2026-03-08T12:00:00.000Z',
  updated_at: '2026-03-08T12:00:00.000Z',
  is_read: false,
  is_delivered: false,
  reply_to_id: null,
};

const createModel = (
  overrides: Partial<MessageItemModel> = {}
): MessageItemModel => ({
  message: baseMessage,
  resolvedMessageUrl: null,
  userId: 'user-a',
  isSelectionMode: false,
  isSelected: false,
  openMenuMessageId: null,
  menuPlacement: 'up',
  menuSideAnchor: 'middle',
  shouldAnimateMenuOpen: true,
  menuTransitionSourceId: null,
  menuOffsetX: 0,
  expandedMessageIds: new Set<string>(),
  flashingMessageId: null,
  isFlashHighlightVisible: false,
  searchMatchedMessageIds: new Set<string>(),
  activeSearchMessageId: null,
  maxMessageChars: 220,
  messageBubbleRefs: { current: new Map() },
  initialMessageAnimationKeysRef: { current: new Set() },
  initialOpenJumpAnimationKeysRef: { current: new Set() },
  captionMessage: undefined,
  pdfMessagePreview: undefined,
  onToggleMessageSelection: () => {},
  toggleMessageMenu: () => {},
  handleToggleExpand: () => {},
  handleEditMessage: () => {},
  handleCopyMessage: async () => {},
  handleDownloadMessage: async () => {},
  handleDeleteMessage: async () => true,
  getAttachmentFileName: () => '',
  getAttachmentFileKind: () => 'document',
  normalizedSearchQuery: '',
  openImageInPortal: async () => {},
  openDocumentInPortal: async () => {},
  ...overrides,
});

describe('areMessageItemPropsEqual', () => {
  it('treats unrelated open-menu message changes as equal for the current item', () => {
    const previousModel = createModel({ openMenuMessageId: 'message-2' });
    const nextModel = createModel({ openMenuMessageId: 'message-3' });

    expect(
      areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })
    ).toBe(true);
  });

  it('detects when the current message selection state changes', () => {
    const previousModel = createModel({ isSelected: false });
    const nextModel = createModel({ isSelected: true });

    expect(
      areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })
    ).toBe(false);
  });

  it('detects when an image preview URL resolves for the current item', () => {
    const previousModel = createModel({ resolvedMessageUrl: null });
    const nextModel = createModel({
      resolvedMessageUrl: 'https://example.com/image.png',
    });

    expect(
      areMessageItemPropsEqual({ model: previousModel }, { model: nextModel })
    ).toBe(false);
  });
});
