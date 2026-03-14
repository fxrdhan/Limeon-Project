import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { MessageBubbleContent } from '../components/messages/MessageBubbleContent';

const buildMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'documents/channel/screenshot.png',
  message_type: overrides.message_type ?? 'file',
  created_at: overrides.created_at ?? '2026-03-10T10:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-10T10:00:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name ?? 'Screenshot.png',
  file_mime_type: overrides.file_mime_type ?? 'image/png',
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/screenshot.png',
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe('MessageBubbleContent', () => {
  it('renders square covered image previews with captions in the same bubble', () => {
    render(
      <MessageBubbleContent
        message={buildMessage()}
        resolvedMessageUrl="https://example.com/screenshot.png"
        isImageMessage={false}
        isFileMessage={true}
        isImageFileMessage={true}
        isPdfFileMessage={false}
        hasAttachmentCaption={true}
        fileName="Screenshot.png"
        fileSecondaryLabel="PNG"
        fileIcon={<span />}
        resolvedPdfPreviewUrl={null}
        pdfMetaLabel={null}
        highlightedMessage="documents/channel/screenshot.png"
        highlightedCaption="Catatan stok"
        hasLeadingEllipsis={false}
        hasTrailingEllipsis={false}
        isMessageLong={false}
        isExpanded={false}
        isFlashingTarget={false}
        onToggleExpand={() => {}}
      />
    );

    const image = screen.getByAltText('Preview Screenshot.png');

    expect(image.className).toContain('object-cover');
    expect(image.parentElement?.className).toContain('aspect-square');
    expect(screen.getByText('Catatan stok')).toBeTruthy();
  });
});
