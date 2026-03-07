import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';
import {
  CHAT_AUDIO_FOLDER,
  CHAT_DOCUMENT_FOLDER,
  CHAT_IMAGE_FOLDER,
} from '../constants';

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
) => {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();
  const extensionFromType = file.type.split('/')[1]?.toLowerCase();
  const rawExtension = extensionFromName || extensionFromType || 'jpg';
  const safeExtension = rawExtension.replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeChannelId = channelId.replace(/[^a-zA-Z0-9_-]/g, '_');

  return `${CHAT_IMAGE_FOLDER}/${safeChannelId}/${senderId}_${Date.now()}.${safeExtension}`;
};

export const buildChatFilePath = (
  channelId: string,
  senderId: string,
  file: File,
  fileKind: ComposerPendingFileKind
) => {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();
  const extensionFromType = file.type.split('/')[1]?.toLowerCase();
  const rawExtension = extensionFromName || extensionFromType || 'bin';
  const safeExtension = rawExtension.replace(/[^a-z0-9]/g, '') || 'bin';
  const safeChannelId = channelId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseFolder =
    fileKind === 'audio' ? CHAT_AUDIO_FOLDER : CHAT_DOCUMENT_FOLDER;

  return `${baseFolder}/${safeChannelId}/${senderId}_${Date.now()}.${safeExtension}`;
};
