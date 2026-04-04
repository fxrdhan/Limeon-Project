import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';
import {
  buildChatFileStoragePath,
  buildChatImageStoragePath,
} from '../../../../shared/chatAttachmentPaths';
import { resolveFileExtension } from '../../../../shared/chatStoragePaths';

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

const getAttachmentUrlFileName = (targetMessage: ChatMessage) => {
  try {
    const normalizedUrl = targetMessage.message.split(/[?#]/)[0];
    const rawName = normalizedUrl.split('/').pop();
    if (!rawName) return null;
    const decodedName = decodeURIComponent(rawName).trim();
    return decodedName || null;
  } catch {
    return null;
  }
};

const padDownloadTimestampPart = (value: number) =>
  String(value).padStart(2, '0');

export const formatChatDownloadTimestamp = (createdAt: string) => {
  const parsedDate = new Date(createdAt);
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return [
    padDownloadTimestampPart(safeDate.getUTCFullYear() % 100),
    padDownloadTimestampPart(safeDate.getUTCMonth() + 1),
    padDownloadTimestampPart(safeDate.getUTCDate()),
    padDownloadTimestampPart(safeDate.getUTCHours()),
    padDownloadTimestampPart(safeDate.getUTCMinutes()),
    padDownloadTimestampPart(safeDate.getUTCSeconds()),
  ].join('');
};

const appendFileExtension = (fileName: string, extension: string) =>
  extension ? `${fileName}.${extension}` : fileName;

const resolveDownloadFileExtension = (
  fileName: string | null,
  mimeType?: string | null
) => {
  const normalizedFileName = fileName?.trim() || '';
  const lastDotIndex = normalizedFileName.lastIndexOf('.');
  const fileNameExtension =
    lastDotIndex > 0 && lastDotIndex < normalizedFileName.length - 1
      ? normalizedFileName.slice(lastDotIndex + 1).toLowerCase()
      : '';

  if (fileNameExtension) {
    return fileNameExtension;
  }

  return resolveFileExtension(null, null, mimeType);
};

export const getChatDownloadFileName = (targetMessage: ChatMessage) => {
  if (
    targetMessage.message_type === 'file' &&
    targetMessage.file_name?.trim()
  ) {
    return targetMessage.file_name.trim();
  }

  const timestamp = formatChatDownloadTimestamp(targetMessage.created_at);
  const resolvedFileName =
    targetMessage.file_name?.trim() || getAttachmentUrlFileName(targetMessage);
  const extension = resolveDownloadFileExtension(
    resolvedFileName ?? null,
    targetMessage.file_mime_type
  );

  if (targetMessage.message_type === 'image') {
    return appendFileExtension(`IMG_${timestamp}`, extension);
  }

  return appendFileExtension(`FILE_${timestamp}`, extension);
};

export const getChatAttachmentGroupZipFileName = (
  targetMessages: Pick<ChatMessage, 'created_at'>[]
) => {
  const referenceMessage = targetMessages[targetMessages.length - 1];
  const timestamp = formatChatDownloadTimestamp(
    referenceMessage?.created_at ?? new Date().toISOString()
  );

  return `ZIP_${timestamp}.zip`;
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
