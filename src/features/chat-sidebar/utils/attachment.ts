import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';
import {
  buildChatFileStoragePath,
  buildChatImageStoragePath,
} from '../../../../shared/chatAttachmentPaths';

export const getAttachmentFileName = (targetMessage: ChatMessage) => {
  if (targetMessage.file_name) return targetMessage.file_name;

  try {
    const normalizedUrl = targetMessage.message.split(/[?#]/)[0];
    const rawName = normalizedUrl.split('/').pop();
    if (!rawName) return 'Lampiran';
    const decodedName = decodeURIComponent(rawName);
    return decodedName || 'Lampiran';
  } catch {
    return 'Lampiran';
  }
};

export const getAttachmentFileKind = (
  targetMessage: ChatMessage
): ComposerPendingFileKind => {
  if (targetMessage.file_kind) return targetMessage.file_kind;

  const detectionSource = [
    targetMessage.file_mime_type || '',
    targetMessage.file_name || '',
    targetMessage.message || '',
  ]
    .join(' ')
    .toLowerCase();
  const isAudio =
    /(audio\/|\.mp3\b|\.wav\b|\.ogg\b|\.m4a\b|\.aac\b|\.flac\b)/.test(
      detectionSource
    );

  return isAudio ? 'audio' : 'document';
};

export const buildChatImagePath = (
  channelId: string,
  senderId: string,
  file: File
) =>
  buildChatImageStoragePath({
    channelId,
    senderId,
    fileName: file.name,
    mimeType: file.type,
  });

export const buildChatFilePath = (
  channelId: string,
  senderId: string,
  file: File,
  fileKind: ComposerPendingFileKind
) =>
  buildChatFileStoragePath({
    channelId,
    senderId,
    fileName: file.name,
    mimeType: file.type,
    fileKind,
  });
