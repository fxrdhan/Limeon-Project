import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  buildChatFilePath,
  buildChatImagePath,
  formatChatDownloadTimestamp,
  getChatAttachmentGroupZipFileName,
  getChatDownloadFileName,
} from '../utils/attachment';
import type { ChatMessage } from '../data/chatSidebarGateway';

describe('attachment utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds unique image storage paths even when Date.now is the same', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_746_000_000_000);
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');

    const file = new File(['image'], 'stok.png', { type: 'image/png' });

    const firstPath = buildChatImagePath('dm_user-a_user-b', 'user-a', file);
    const secondPath = buildChatImagePath('dm_user-a_user-b', 'user-a', file);

    expect(firstPath).toBe(
      'images/dm_user-a_user-b/user-a_image_11111111-1111-4111-8111-111111111111.png'
    );
    expect(secondPath).toBe(
      'images/dm_user-a_user-b/user-a_image_22222222-2222-4222-8222-222222222222.png'
    );
  });

  it('builds unique file storage paths even when Date.now is the same', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_746_000_000_000);
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('33333333-3333-4333-8333-333333333333')
      .mockReturnValueOnce('44444444-4444-4444-8444-444444444444');

    const file = new File(['pdf'], 'stok.pdf', { type: 'application/pdf' });

    const firstPath = buildChatFilePath(
      'dm_user-a_user-b',
      'user-a',
      file,
      'document'
    );
    const secondPath = buildChatFilePath(
      'dm_user-a_user-b',
      'user-a',
      file,
      'document'
    );

    expect(firstPath).toBe(
      'documents/dm_user-a_user-b/user-a_document_33333333-3333-4333-8333-333333333333.pdf'
    );
    expect(secondPath).toBe(
      'documents/dm_user-a_user-b/user-a_document_44444444-4444-4444-8444-444444444444.pdf'
    );
  });

  it('formats download timestamps from the server created_at in UTC', () => {
    expect(formatChatDownloadTimestamp('2026-04-03T09:08:07.000Z')).toBe(
      '260403090807'
    );
  });

  it('uses IMG-prefixed names for image downloads', () => {
    const message = {
      created_at: '2026-04-03T09:08:07.000Z',
      file_mime_type: 'image/png',
      file_name: 'stok-lama.png',
      message: 'https://example.com/storage/stok-lama.png',
      message_type: 'image',
    } as ChatMessage;

    expect(getChatDownloadFileName(message)).toBe('IMG_260403090807.png');
  });

  it('preserves source names for file attachments when available', () => {
    const message = {
      created_at: '2026-04-03T09:08:07.000Z',
      file_mime_type: 'application/pdf',
      file_name: 'invoice.pdf',
      message: 'https://example.com/storage/invoice.pdf',
      message_type: 'file',
    } as ChatMessage;

    expect(getChatDownloadFileName(message)).toBe('invoice.pdf');
  });

  it('uses FILE-prefixed names for file attachments without a source name', () => {
    const message = {
      created_at: '2026-04-03T09:08:07.000Z',
      file_mime_type: 'application/pdf',
      file_name: null,
      message: 'https://example.com/storage/view?id=123',
      message_type: 'file',
    } as ChatMessage;

    expect(getChatDownloadFileName(message)).toBe('FILE_260403090807.pdf');
  });

  it('uses ZIP-prefixed names for grouped image downloads', () => {
    expect(
      getChatAttachmentGroupZipFileName([
        { created_at: '2026-04-03T09:08:06.000Z' } as ChatMessage,
        { created_at: '2026-04-03T09:08:07.000Z' } as ChatMessage,
      ])
    ).toBe('ZIP_260403090807.zip');
  });
});
