import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import MessageItem, {
  type MessageItemModel,
} from '../components/messages/MessageItem';

const baseMessage = {
  id: 'message-1',
  sender_id: 'user-a',
  receiver_id: 'user-b',
  channel_id: 'channel-1',
  message:
    'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
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
  isGroupedWithPrevious: false,
  isGroupedWithNext: false,
  isFirstVisibleMessage: true,
  isSelectionMode: false,
  isSelected: false,
  openMenuMessageId: null,
  menuPlacement: 'up',
  menuSideAnchor: 'middle',
  shouldAnimateMenuOpen: false,
  menuTransitionSourceId: null,
  menuOffsetX: 0,
  expandedMessageIds: new Set<string>(),
  flashingMessageId: null,
  isFlashHighlightVisible: false,
  searchMatchedMessageIds: new Set<string>(),
  activeSearchMessageId: null,
  maxMessageChars: 500,
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
  handleOpenForwardMessagePicker: () => {},
  handleDeleteMessage: async () => true,
  getAttachmentFileName: () => '',
  getAttachmentFileKind: () => 'document',
  normalizedSearchQuery: '',
  openImageInPortal: async () => {},
  openDocumentInPortal: async () => {},
  ...overrides,
});

describe('MessageItem', () => {
  it('keeps text bubbles shrinkable for long links', () => {
    render(<MessageItem model={createModel()} />);

    const bubble = screen.getByRole('button');
    const bubbleWrapper = bubble.parentElement;
    const bubbleColumn = bubbleWrapper?.parentElement;

    expect(bubble.className).toContain('w-fit');
    expect(bubbleWrapper?.className).toContain('min-w-0');
    expect(bubbleColumn?.className).toContain('min-w-0');
    expect(bubble.getAttribute('style')).toContain('overflow-wrap: anywhere;');
  });

  it('uses a slate full-row highlight for selected messages without changing bubble tone', () => {
    const { container } = render(
      <MessageItem
        model={createModel({
          isSelectionMode: true,
          isSelected: true,
        })}
      />
    );

    const row = container.firstElementChild as HTMLElement | null;
    const bubble = screen.getByRole('button');
    const highlight = container.querySelector('[aria-hidden="true"]');

    expect(row?.className).toContain('group');
    expect(highlight?.className).toContain('-inset-x-3');
    expect(highlight?.className).toContain('bg-slate-200');
    expect(bubble.className).toContain('bg-emerald-200');
    expect(bubble.className).toContain('text-slate-900');
    expect(
      screen.getByRole('link', { name: baseMessage.message }).parentElement
        ?.className
    ).toContain('pointer-events-none');
    expect(container.querySelector('.rounded-full.border')).toBeNull();
  });

  it('moves the outgoing tail to the top-right corner for a standalone bubble', () => {
    render(<MessageItem model={createModel()} />);

    const bubble = screen.getByRole('button');

    expect(bubble.className).toContain('rounded-tr-[2px]');
    expect(bubble.className).toContain('rounded-br-xl');
    expect(bubble.className).not.toContain('rounded-br-[2px]');
  });

  it('keeps grouped outgoing bubbles connected and uses a single tail at the group start', () => {
    const { container } = render(
      <MessageItem
        model={createModel({
          isGroupedWithPrevious: true,
          isGroupedWithNext: true,
          isFirstVisibleMessage: false,
        })}
      />
    );

    const row = container.firstElementChild as HTMLElement | null;
    const bubble = screen.getByRole('button');

    expect(row?.className).toContain('mt-1');
    expect(bubble.className).toContain('rounded-tr-md');
    expect(bubble.className).toContain('rounded-br-md');
    expect(bubble.className).not.toContain('rounded-tr-[2px]');
    expect(bubble.className).not.toContain('rounded-br-[2px]');
  });
});
