import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { MessageBubbleContent } from '../components/messages/MessageBubbleContent';
import { renderHighlightedText } from '../utils/message-search';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  it('renders text message urls as hyperlinks that stop bubble clicks', () => {
    const url =
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing';
    const parentClick = vi.fn();

    render(
      <div role="button" tabIndex={-1} onClick={parentClick}>
        <MessageBubbleContent
          message={buildMessage({
            message: url,
            message_type: 'text',
          })}
          resolvedMessageUrl={null}
          isSelectionMode={false}
          isImageMessage={false}
          isFileMessage={false}
          isImageFileMessage={false}
          isPdfFileMessage={false}
          hasAttachmentCaption={false}
          fileName={null}
          fileSecondaryLabel={null}
          fileIcon={<span />}
          resolvedPdfPreviewUrl={null}
          pdfMetaLabel={null}
          highlightedMessage={renderHighlightedText(url, '', {
            linkify: true,
          })}
          highlightedCaption=""
          hasLeadingEllipsis={false}
          hasTrailingEllipsis={false}
          isMessageLong={false}
          isExpanded={false}
          isHighlightedBubble={false}
          onToggleExpand={() => {}}
        />
      </div>
    );

    const link = screen.getByRole('link', { name: url });

    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    fireEvent.click(link);

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('renders text message links without an explicit protocol as hyperlinks', () => {
    const url = 'shrtnk.works/bwdrrk3ugm';

    render(
      <MessageBubbleContent
        message={buildMessage({
          message: url,
          message_type: 'text',
        })}
        resolvedMessageUrl={null}
        isSelectionMode={false}
        isImageMessage={false}
        isFileMessage={false}
        isImageFileMessage={false}
        isPdfFileMessage={false}
        hasAttachmentCaption={false}
        fileName={null}
        fileSecondaryLabel={null}
        fileIcon={<span />}
        resolvedPdfPreviewUrl={null}
        pdfMetaLabel={null}
        highlightedMessage={renderHighlightedText(url, '', {
          linkify: true,
        })}
        highlightedCaption=""
        hasLeadingEllipsis={false}
        hasTrailingEllipsis={false}
        isMessageLong={false}
        isExpanded={false}
        isHighlightedBubble={false}
        onToggleExpand={() => {}}
      />
    );

    const link = screen.getByRole('link', { name: url });

    expect(link.getAttribute('href')).toBe(`https://${url}`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders bare domains without a path as hyperlinks', () => {
    const url = 'github.com';

    render(
      <MessageBubbleContent
        message={buildMessage({
          message: url,
          message_type: 'text',
        })}
        resolvedMessageUrl={null}
        isSelectionMode={false}
        isImageMessage={false}
        isFileMessage={false}
        isImageFileMessage={false}
        isPdfFileMessage={false}
        hasAttachmentCaption={false}
        fileName={null}
        fileSecondaryLabel={null}
        fileIcon={<span />}
        resolvedPdfPreviewUrl={null}
        pdfMetaLabel={null}
        highlightedMessage={renderHighlightedText(url, '', {
          linkify: true,
        })}
        highlightedCaption=""
        hasLeadingEllipsis={false}
        hasTrailingEllipsis={false}
        isMessageLong={false}
        isExpanded={false}
        isHighlightedBubble={false}
        onToggleExpand={() => {}}
      />
    );

    const link = screen.getByRole('link', { name: url });

    expect(link.getAttribute('href')).toBe(`https://${url}/`);
  });

  it('renders attachment caption urls as hyperlinks', () => {
    const url = 'https://example.com/report';

    render(
      <MessageBubbleContent
        message={buildMessage()}
        resolvedMessageUrl="https://example.com/screenshot.png"
        isSelectionMode={false}
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
        highlightedCaption={renderHighlightedText(url, '', {
          linkify: true,
        })}
        hasLeadingEllipsis={false}
        hasTrailingEllipsis={false}
        isMessageLong={false}
        isExpanded={false}
        isHighlightedBubble={false}
        onToggleExpand={() => {}}
      />
    );

    expect(screen.getByRole('link', { name: url })).toBeTruthy();
  });

  it('opens a custom context menu for bubble links and copies the visible link text', async () => {
    const url = 'shrtnk.works/bwdrrk3ugm';
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <MessageBubbleContent
        message={buildMessage({
          message: url,
          message_type: 'text',
        })}
        resolvedMessageUrl={null}
        isSelectionMode={false}
        isImageMessage={false}
        isFileMessage={false}
        isImageFileMessage={false}
        isPdfFileMessage={false}
        hasAttachmentCaption={false}
        fileName={null}
        fileSecondaryLabel={null}
        fileIcon={<span />}
        resolvedPdfPreviewUrl={null}
        pdfMetaLabel={null}
        highlightedMessage={renderHighlightedText(url, '', {
          linkify: true,
        })}
        highlightedCaption=""
        hasLeadingEllipsis={false}
        hasTrailingEllipsis={false}
        isMessageLong={false}
        isExpanded={false}
        isHighlightedBubble={false}
        onToggleExpand={() => {}}
      />
    );

    const link = screen.getByRole('link', { name: url });

    fireEvent.contextMenu(link, { clientX: 80, clientY: 120 });

    const copyButton = screen.getByRole('button', { name: 'Salin' });
    expect(screen.getByRole('button', { name: 'Buka' })).toBeTruthy();

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(url);
      expect(mockToast.success).toHaveBeenCalledWith('Link berhasil disalin', {
        toasterId: 'chat-sidebar-toaster',
      });
    });
  });
});
