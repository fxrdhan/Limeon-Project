import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  TbCircleArrowDownFilled,
  TbCopy,
  TbDownload,
  TbEye,
  TbFileTypeCsv,
  TbFileTypeDoc,
  TbFileTypeDocx,
  TbFileTypeJpg,
  TbFileTypePdf,
  TbFileTypePng,
  TbFileTypePpt,
  TbFileTypeTxt,
  TbFileTypeXls,
  TbFileTypeZip,
  TbFileUnknown,
  TbMusic,
  TbPencil,
  TbTrash,
} from 'react-icons/tb';
import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import type { ChatMessage } from '@/services/api/chat.service';
import { supabase } from '@/lib/supabase';
import { CHAT_IMAGE_BUCKET } from '../constants';
import type {
  ChatSidebarPanelTargetUser,
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../types';

interface ChatPanelUser {
  id?: string;
  name?: string;
}

const resolveFileExtension = (
  fileName: string | null,
  fileUrl: string,
  mimeType?: string
) => {
  const rawSource = fileName || fileUrl || '';
  const sourceWithoutQuery = rawSource.split(/[?#]/)[0];
  const directExtension = sourceWithoutQuery
    .split('.')
    .pop()
    ?.trim()
    .toLowerCase();

  if (directExtension) {
    return directExtension;
  }

  const mimeSubtype = mimeType?.split('/')[1]?.split('+')[0]?.toLowerCase();
  if (!mimeSubtype) return '';

  if (mimeSubtype === 'jpeg') return 'jpg';
  if (mimeSubtype === 'png') return 'png';
  if (mimeSubtype === 'pdf') return 'pdf';
  if (mimeSubtype === 'msword') return 'doc';
  if (mimeSubtype.includes('wordprocessingml')) return 'docx';
  if (mimeSubtype === 'csv') return 'csv';
  if (mimeSubtype === 'plain') return 'txt';
  if (
    mimeSubtype.includes('powerpoint') ||
    mimeSubtype.includes('presentation')
  )
    return 'pptx';
  if (mimeSubtype.includes('excel') || mimeSubtype.includes('spreadsheet'))
    return 'xlsx';
  if (mimeSubtype.includes('zip') || mimeSubtype.includes('compressed'))
    return 'zip';

  return '';
};

const formatFileSize = (sizeBytes?: number) => {
  if (
    typeof sizeBytes !== 'number' ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 0
  ) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};

const formatFileFallbackLabel = (
  fileExtension: string,
  fileKind: ComposerPendingFileKind
) => {
  if (fileExtension) return fileExtension.toUpperCase();
  return fileKind === 'audio' ? 'AUDIO' : 'FILE';
};

const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const extractChatStoragePath = (url: string): string | null => {
  const patterns = [
    '/storage/v1/object/public/chat/',
    '/storage/v1/object/sign/chat/',
    '/storage/v1/object/authenticated/chat/',
  ];

  for (const pattern of patterns) {
    const rawPath = url.split(pattern)[1];
    if (!rawPath) continue;

    const pathWithoutQuery = rawPath.split(/[?#]/)[0];
    if (!pathWithoutQuery) continue;

    try {
      return decodeURIComponent(pathWithoutQuery);
    } catch {
      return pathWithoutQuery;
    }
  }

  return null;
};

const fetchPdfBlobWithFallback = async (
  url: string,
  storagePathHint?: string | null
): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const responseBlob = await response.blob();
      return responseBlob.type === 'application/pdf'
        ? responseBlob
        : new Blob([responseBlob], { type: 'application/pdf' });
    }
  } catch {
    // Continue to storage fallback
  }

  const storagePath = storagePathHint?.trim() || extractChatStoragePath(url);
  if (!storagePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from(CHAT_IMAGE_BUCKET)
      .download(storagePath);
    if (error || !data) return null;

    return data.type === 'application/pdf'
      ? data
      : new Blob([data], { type: 'application/pdf' });
  } catch {
    return null;
  }
};

const IMAGE_FILE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'svg',
  'heic',
  'heif',
]);

const isImageFileExtensionOrMime = (extension: string, mimeType?: string) =>
  IMAGE_FILE_EXTENSIONS.has(extension) ||
  mimeType?.toLowerCase().startsWith('image/') === true;

type PdfMessagePreview = {
  coverDataUrl: string;
  pageCount: number;
  cacheKey: string;
};

const pdfMessagePreviewCache = new Map<string, PdfMessagePreview>();
const PDF_PREVIEW_MAX_RETRY_ATTEMPTS = 3;
const PDF_PREVIEW_RETRY_BASE_DELAY_MS = 900;

const buildPdfMessagePreviewCacheKey = (
  message: ChatMessage,
  fileName: string
) => {
  const stableIdentity =
    message.stableKey ||
    `${message.id}::${message.updated_at}::${message.message}`;

  return [
    stableIdentity,
    fileName,
    message.file_size ?? '',
    message.file_mime_type ?? '',
  ].join('::');
};

interface MessagesPaneProps {
  loading: boolean;
  messages: ChatMessage[];
  user?: ChatPanelUser | null;
  targetUser?: ChatSidebarPanelTargetUser;
  displayUserPhotoUrl: string | null;
  displayTargetPhotoUrl: string | null;
  messageInputHeight: number;
  composerContextualOffset: number;
  openMenuMessageId: string | null;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  showScrollToBottom: boolean;
  maxMessageChars: number;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  closeMessageMenu: () => void;
  toggleMessageMenu: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
  handleToggleExpand: (messageId: string) => void;
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<void>;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
  onScrollToBottom: () => void;
}

const MessagesPane = ({
  loading,
  messages,
  user,
  targetUser,
  displayUserPhotoUrl,
  displayTargetPhotoUrl,
  messageInputHeight,
  composerContextualOffset,
  openMenuMessageId,
  menuPlacement,
  menuSideAnchor,
  shouldAnimateMenuOpen,
  menuTransitionSourceId,
  menuOffsetX,
  expandedMessageIds,
  flashingMessageId,
  isFlashHighlightVisible,
  showScrollToBottom,
  maxMessageChars,
  messagesContainerRef,
  messagesEndRef,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  closeMessageMenu,
  toggleMessageMenu,
  handleToggleExpand,
  handleEditMessage,
  handleCopyMessage,
  handleDownloadMessage,
  handleDeleteMessage,
  getAttachmentFileName,
  getAttachmentFileKind,
  getInitials,
  getInitialsColor,
  onScrollToBottom,
}: MessagesPaneProps) => {
  const [pdfMessagePreviews, setPdfMessagePreviews] = useState<
    Record<string, PdfMessagePreview>
  >({});
  const [, setPdfPreviewRetryNonce] = useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewName, setImagePreviewName] = useState('');
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const imagePreviewCloseTimerRef = useRef<number | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(
    null
  );
  const [documentPreviewName, setDocumentPreviewName] = useState('');
  const [isDocumentPreviewVisible, setIsDocumentPreviewVisible] =
    useState(false);
  const documentPreviewCloseTimerRef = useRef<number | null>(null);
  const documentPreviewObjectUrlRef = useRef<string | null>(null);
  const pdfPreviewRenderingIdsRef = useRef<Set<string>>(new Set());
  const pdfPreviewRetryAttemptsRef = useRef<Map<string, number>>(new Map());
  const pdfPreviewRetryTimersRef = useRef<Map<string, number>>(new Map());

  const clearPdfPreviewRetryTimer = useCallback((messageId: string) => {
    const existingTimerId = pdfPreviewRetryTimersRef.current.get(messageId);
    if (!existingTimerId) return;
    window.clearTimeout(existingTimerId);
    pdfPreviewRetryTimersRef.current.delete(messageId);
  }, []);

  const schedulePdfPreviewRetry = useCallback((messageId: string) => {
    if (pdfPreviewRetryTimersRef.current.has(messageId)) return;

    const nextAttemptCount =
      (pdfPreviewRetryAttemptsRef.current.get(messageId) ?? 0) + 1;
    pdfPreviewRetryAttemptsRef.current.set(messageId, nextAttemptCount);

    if (nextAttemptCount >= PDF_PREVIEW_MAX_RETRY_ATTEMPTS) return;

    const retryDelay = PDF_PREVIEW_RETRY_BASE_DELAY_MS * nextAttemptCount;
    const retryTimerId = window.setTimeout(() => {
      pdfPreviewRetryTimersRef.current.delete(messageId);
      setPdfPreviewRetryNonce(prevNonce => prevNonce + 1);
    }, retryDelay);
    pdfPreviewRetryTimersRef.current.set(messageId, retryTimerId);
  }, []);

  const closeImagePreview = useCallback(() => {
    setIsImagePreviewVisible(false);
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    imagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setImagePreviewUrl(null);
      setImagePreviewName('');
      imagePreviewCloseTimerRef.current = null;
    }, 150);
  }, []);

  const openImageInPortal = useCallback((url: string, previewName: string) => {
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    setImagePreviewUrl(url);
    setImagePreviewName(previewName);
    requestAnimationFrame(() => {
      setIsImagePreviewVisible(true);
    });
  }, []);

  const releaseDocumentPreviewObjectUrl = useCallback(() => {
    if (!documentPreviewObjectUrlRef.current) return;
    URL.revokeObjectURL(documentPreviewObjectUrlRef.current);
    documentPreviewObjectUrlRef.current = null;
  }, []);

  const closeDocumentPreview = useCallback(() => {
    setIsDocumentPreviewVisible(false);
    if (documentPreviewCloseTimerRef.current) {
      window.clearTimeout(documentPreviewCloseTimerRef.current);
      documentPreviewCloseTimerRef.current = null;
    }
    documentPreviewCloseTimerRef.current = window.setTimeout(() => {
      setDocumentPreviewUrl(null);
      setDocumentPreviewName('');
      releaseDocumentPreviewObjectUrl();
      documentPreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseDocumentPreviewObjectUrl]);

  const openDocumentInPortal = useCallback(
    async (url: string, previewName: string, forcePdfMime = false) => {
      if (documentPreviewCloseTimerRef.current) {
        window.clearTimeout(documentPreviewCloseTimerRef.current);
        documentPreviewCloseTimerRef.current = null;
      }
      releaseDocumentPreviewObjectUrl();

      let nextPreviewUrl = url;
      if (forcePdfMime) {
        try {
          const pdfBlob = await fetchPdfBlobWithFallback(url);
          if (pdfBlob) {
            const pdfBlobUrl = URL.createObjectURL(pdfBlob);
            documentPreviewObjectUrlRef.current = pdfBlobUrl;
            nextPreviewUrl = pdfBlobUrl;
          }
        } catch {
          nextPreviewUrl = url;
        }
      }

      setDocumentPreviewUrl(nextPreviewUrl);
      setDocumentPreviewName(previewName);
      requestAnimationFrame(() => {
        setIsDocumentPreviewVisible(true);
      });
    },
    [releaseDocumentPreviewObjectUrl]
  );

  useEffect(() => {
    const pdfPreviewRetryTimers = pdfPreviewRetryTimersRef.current;

    return () => {
      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      if (documentPreviewCloseTimerRef.current) {
        window.clearTimeout(documentPreviewCloseTimerRef.current);
        documentPreviewCloseTimerRef.current = null;
      }
      pdfPreviewRetryTimers.forEach(timerId => {
        window.clearTimeout(timerId);
      });
      pdfPreviewRetryTimers.clear();
      releaseDocumentPreviewObjectUrl();
    };
  }, [releaseDocumentPreviewObjectUrl]);

  useEffect(() => {
    setPdfMessagePreviews(prevPreviews => {
      let hasChanges = false;
      const nextPreviews: Record<string, PdfMessagePreview> = {};

      for (const message of messages) {
        if (message.message_type !== 'file') continue;
        if (getAttachmentFileKind(message) !== 'document') continue;

        const fileName = getAttachmentFileName(message);
        const extension = resolveFileExtension(
          fileName,
          message.message,
          message.file_mime_type
        );
        const isPdf =
          extension === 'pdf' ||
          message.file_mime_type?.toLowerCase().includes('pdf') === true;
        if (!isPdf) continue;

        const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
        const existingPreview = prevPreviews[message.id];

        if (existingPreview?.cacheKey === cacheKey) {
          nextPreviews[message.id] = existingPreview;
          continue;
        }

        const cachedPreview = pdfMessagePreviewCache.get(cacheKey);
        if (cachedPreview) {
          nextPreviews[message.id] = cachedPreview;
          hasChanges = true;
          continue;
        }

        if (existingPreview) {
          hasChanges = true;
        }
      }

      if (
        Object.keys(nextPreviews).length !== Object.keys(prevPreviews).length
      ) {
        hasChanges = true;
      }

      return hasChanges ? nextPreviews : prevPreviews;
    });
  }, [getAttachmentFileKind, getAttachmentFileName, messages]);

  useEffect(() => {
    const activePdfMessageIds = new Set<string>();

    for (const message of messages) {
      if (message.message_type !== 'file') continue;
      if (getAttachmentFileKind(message) !== 'document') continue;

      const fileName = getAttachmentFileName(message);
      const extension = resolveFileExtension(
        fileName,
        message.message,
        message.file_mime_type
      );
      const isPdf =
        extension === 'pdf' ||
        message.file_mime_type?.toLowerCase().includes('pdf') === true;
      if (!isPdf) continue;

      activePdfMessageIds.add(message.id);
    }

    for (const [messageId] of pdfPreviewRetryAttemptsRef.current) {
      if (activePdfMessageIds.has(messageId)) continue;
      pdfPreviewRetryAttemptsRef.current.delete(messageId);
      clearPdfPreviewRetryTimer(messageId);
      pdfPreviewRenderingIdsRef.current.delete(messageId);
    }
  }, [
    clearPdfPreviewRetryTimer,
    getAttachmentFileKind,
    getAttachmentFileName,
    messages,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const pendingPdfMessages = messages.filter(message => {
      if (message.message_type !== 'file') return false;
      if (getAttachmentFileKind(message) !== 'document') return false;

      const fileName = getAttachmentFileName(message);
      const extension = resolveFileExtension(
        fileName,
        message.message,
        message.file_mime_type
      );
      const isPdf =
        extension === 'pdf' ||
        message.file_mime_type?.toLowerCase().includes('pdf') === true;
      if (!isPdf) return false;
      const hasPersistedPreviewUrl =
        typeof message.file_preview_url === 'string' &&
        message.file_preview_url.trim().length > 0;
      if (hasPersistedPreviewUrl) return false;
      const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
      if (pdfMessagePreviews[message.id]?.cacheKey === cacheKey) return false;
      if (pdfMessagePreviewCache.has(cacheKey)) return false;
      if (pdfPreviewRenderingIdsRef.current.has(message.id)) return false;
      if (pdfPreviewRetryTimersRef.current.has(message.id)) return false;
      if (
        (pdfPreviewRetryAttemptsRef.current.get(message.id) ?? 0) >=
        PDF_PREVIEW_MAX_RETRY_ATTEMPTS
      ) {
        return false;
      }
      return true;
    });

    if (pendingPdfMessages.length === 0) return;

    const renderPdfPreviews = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfWorkerModule =
          await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

        for (const pendingMessage of pendingPdfMessages) {
          if (isCancelled) return;
          pdfPreviewRenderingIdsRef.current.add(pendingMessage.id);

          const pendingFileName = getAttachmentFileName(pendingMessage);
          const cacheKey = buildPdfMessagePreviewCacheKey(
            pendingMessage,
            pendingFileName
          );
          let pdfDocument: {
            numPages: number;
            getPage: (pageNumber: number) => Promise<any>;
            cleanup: () => void;
            destroy: () => void;
          } | null = null;

          try {
            const pdfBlob = await fetchPdfBlobWithFallback(
              pendingMessage.message,
              pendingMessage.file_storage_path
            );
            if (!pdfBlob) {
              schedulePdfPreviewRetry(pendingMessage.id);
              continue;
            }
            const fileBuffer = await pdfBlob.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(
              new Uint8Array(fileBuffer)
            );
            const loadedPdfDocument = await loadingTask.promise;
            pdfDocument = loadedPdfDocument;
            const firstPage = await loadedPdfDocument.getPage(1);
            const baseViewport = firstPage.getViewport({ scale: 1 });
            const targetWidth = 260;
            const scale = targetWidth / Math.max(baseViewport.width, 1);
            const viewport = firstPage.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              schedulePdfPreviewRetry(pendingMessage.id);
              continue;
            }

            canvas.width = Math.max(1, Math.round(viewport.width));
            canvas.height = Math.max(1, Math.round(viewport.height));

            await firstPage.render({
              canvas,
              canvasContext: context,
              viewport,
              background: 'rgb(255, 255, 255)',
            }).promise;

            if (isCancelled) return;

            const coverDataUrl = canvas.toDataURL('image/png');
            const nextPreview: PdfMessagePreview = {
              coverDataUrl,
              pageCount: Math.max(loadedPdfDocument.numPages ?? 1, 1),
              cacheKey,
            };
            pdfMessagePreviewCache.set(cacheKey, nextPreview);
            pdfPreviewRetryAttemptsRef.current.delete(pendingMessage.id);
            clearPdfPreviewRetryTimer(pendingMessage.id);
            setPdfMessagePreviews(prev => ({
              ...prev,
              [pendingMessage.id]: nextPreview,
            }));
          } catch (error) {
            console.error('Error rendering PDF message preview:', error);
            schedulePdfPreviewRetry(pendingMessage.id);
          } finally {
            pdfDocument?.cleanup();
            pdfDocument?.destroy();
            pdfPreviewRenderingIdsRef.current.delete(pendingMessage.id);
          }
        }
      } catch (error) {
        console.error('Error preparing PDF preview renderer:', error);
        for (const pendingMessage of pendingPdfMessages) {
          schedulePdfPreviewRetry(pendingMessage.id);
        }
      }
    };

    void renderPdfPreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    getAttachmentFileKind,
    getAttachmentFileName,
    messages,
    pdfMessagePreviews,
    clearPdfPreviewRetryTimer,
    schedulePdfPreviewRetry,
  ]);

  const { captionMessagesByAttachmentId, captionMessageIds } = useMemo(() => {
    const attachmentMessagesById = new Map<string, ChatMessage>();
    const captionMap = new Map<string, ChatMessage>();
    const captionIds = new Set<string>();

    for (const message of messages) {
      if (message.message_type === 'image' || message.message_type === 'file') {
        attachmentMessagesById.set(message.id, message);
      }
    }

    for (const message of messages) {
      if (message.message_type !== 'text' || !message.reply_to_id) continue;

      const parentMessage = attachmentMessagesById.get(message.reply_to_id);
      if (!parentMessage) continue;
      if (parentMessage.sender_id !== message.sender_id) continue;
      if (parentMessage.receiver_id !== message.receiver_id) continue;
      if (parentMessage.channel_id !== message.channel_id) continue;
      if (captionMap.has(parentMessage.id)) continue;

      captionMap.set(parentMessage.id, message);
      captionIds.add(message.id);
    }

    return {
      captionMessagesByAttachmentId: captionMap,
      captionMessageIds: captionIds,
    };
  }, [messages]);

  return (
    <>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-x-hidden px-3 pt-3 overflow-y-auto space-y-3 transition-[padding-bottom] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          overflowAnchor: 'none',
          paddingBottom: messageInputHeight + 84 + composerContextualOffset,
        }}
        onClick={closeMessageMenu}
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-slate-400 text-sm">Loading messages...</div>
          </div>
        ) : (
          <LayoutGroup id="chat-message-menus">
            {messages.map(msg => {
              if (captionMessageIds.has(msg.id)) {
                return null;
              }

              const isCurrentUser = msg.sender_id === user?.id;
              const captionMessage = captionMessagesByAttachmentId.get(msg.id);
              const attachmentCaptionText =
                captionMessage?.message?.trim() ?? '';
              const hasAttachmentCaption =
                (msg.message_type === 'image' || msg.message_type === 'file') &&
                attachmentCaptionText.length > 0;
              const displayTime = new Date(msg.created_at).toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );
              const createdTimestamp = new Date(msg.created_at).getTime();
              const updatedTimestamp = new Date(msg.updated_at).getTime();
              const isEdited =
                Number.isFinite(createdTimestamp) &&
                Number.isFinite(updatedTimestamp) &&
                updatedTimestamp > createdTimestamp;
              const isMenuOpen = openMenuMessageId === msg.id;
              const isMenuTransitionSource = menuTransitionSourceId === msg.id;
              const isFlashSequenceTarget = flashingMessageId === msg.id;
              const isFlashingTarget =
                isFlashSequenceTarget && isFlashHighlightVisible;
              const isImageMessage = msg.message_type === 'image';
              const isFileMessage = msg.message_type === 'file';
              const fileKind = isFileMessage
                ? getAttachmentFileKind(msg)
                : 'document';
              const isAudioFileMessage = isFileMessage && fileKind === 'audio';
              const fileName = isFileMessage
                ? getAttachmentFileName(msg)
                : null;
              const fileExtension = isFileMessage
                ? resolveFileExtension(
                    fileName,
                    msg.message,
                    msg.file_mime_type
                  )
                : '';
              const fileSizeLabel = isFileMessage
                ? formatFileSize(msg.file_size)
                : null;
              const fileFallbackLabel = isFileMessage
                ? formatFileFallbackLabel(fileExtension, fileKind)
                : null;
              const isPdfFileMessage =
                isFileMessage &&
                !isAudioFileMessage &&
                (fileExtension === 'pdf' ||
                  msg.file_mime_type?.toLowerCase().includes('pdf') === true);
              const isImageFileMessage =
                isFileMessage &&
                !isAudioFileMessage &&
                isImageFileExtensionOrMime(fileExtension, msg.file_mime_type);
              const pdfPreviewCacheKey =
                isPdfFileMessage && fileName
                  ? buildPdfMessagePreviewCacheKey(msg, fileName)
                  : null;
              const pdfMessagePreview = isPdfFileMessage
                ? pdfMessagePreviews[msg.id] &&
                  pdfMessagePreviews[msg.id].cacheKey === pdfPreviewCacheKey
                  ? pdfMessagePreviews[msg.id]
                  : pdfPreviewCacheKey
                    ? pdfMessagePreviewCache.get(pdfPreviewCacheKey)
                    : undefined
                : undefined;
              const persistedPdfPreviewUrl = isPdfFileMessage
                ? msg.file_preview_url?.trim() || null
                : null;
              const resolvedPdfPreviewUrl =
                persistedPdfPreviewUrl ||
                pdfMessagePreview?.coverDataUrl ||
                null;
              const resolvedPdfPageCount = isPdfFileMessage
                ? (msg.file_preview_page_count ?? pdfMessagePreview?.pageCount)
                : null;
              const pdfMetaLabel = isPdfFileMessage
                ? [
                    resolvedPdfPageCount
                      ? `${resolvedPdfPageCount} halaman`
                      : null,
                    'PDF',
                    fileSizeLabel,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'PDF'
                : null;
              const fileIcon = isAudioFileMessage ? (
                <TbMusic className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'jpg' || fileExtension === 'jpeg' ? (
                <TbFileTypeJpg className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'png' ? (
                <TbFileTypePng className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'pdf' ? (
                <TbFileTypePdf className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'docx' ? (
                <TbFileTypeDocx className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'doc' ? (
                <TbFileTypeDoc className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'csv' ? (
                <TbFileTypeCsv className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'ppt' || fileExtension === 'pptx' ? (
                <TbFileTypePpt className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'txt' ? (
                <TbFileTypeTxt className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'zip' ? (
                <TbFileTypeZip className="h-8 w-8 shrink-0 text-slate-600" />
              ) : fileExtension === 'xls' ||
                fileExtension === 'xlsx' ||
                fileExtension === 'x' ? (
                <TbFileTypeXls className="h-8 w-8 shrink-0 text-slate-600" />
              ) : (
                <TbFileUnknown className="h-8 w-8 shrink-0 text-slate-600" />
              );
              const bubbleToneClass = isFlashingTarget
                ? 'bg-primary text-white'
                : isCurrentUser
                  ? 'bg-emerald-200 text-slate-900'
                  : 'bg-slate-100 text-slate-800';
              const bubbleOpacityClass = isFlashSequenceTarget
                ? isFlashHighlightVisible
                  ? 'opacity-100'
                  : 'opacity-60'
                : 'opacity-100';

              const animationKey = msg.stableKey || msg.id;
              const shouldAnimateEnter =
                !initialMessageAnimationKeysRef.current.has(animationKey);
              const shouldAnimateOpenJump =
                !shouldAnimateEnter &&
                initialOpenJumpAnimationKeysRef.current.has(animationKey);
              const targetAnimation = shouldAnimateOpenJump
                ? {
                    opacity: 1,
                    scale: [1, 1.04, 1],
                    x: 0,
                    y: [0, -8, 0],
                  }
                : { opacity: 1, scale: 1, x: 0, y: 0 };
              const animationTransition = shouldAnimateOpenJump
                ? {
                    duration: 0.36,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }
                : {
                    duration: 0.3,
                    ease: [0.23, 1, 0.32, 1] as const,
                    type: 'spring' as const,
                    stiffness: 300,
                    damping: 24,
                  };

              const isExpanded = expandedMessageIds.has(msg.id);
              const isMessageLong =
                !isImageMessage &&
                !isFileMessage &&
                !isExpanded &&
                msg.message.length > maxMessageChars;
              const displayMessage = isMessageLong
                ? msg.message.slice(0, maxMessageChars).trimEnd()
                : msg.message;
              const menuActions: PopupMenuAction[] = [
                {
                  label: 'Salin',
                  icon: <TbCopy className="h-4 w-4" />,
                  onClick: () => {
                    void handleCopyMessage(msg);
                  },
                },
              ];

              if (isImageMessage || isFileMessage) {
                menuActions.unshift({
                  label: 'Buka',
                  icon: <TbEye className="h-4 w-4" />,
                  onClick: () => {
                    if (isImageMessage || isImageFileMessage) {
                      openImageInPortal(msg.message, fileName || 'Gambar');
                      return;
                    }
                    if (
                      isFileMessage &&
                      fileKind === 'document' &&
                      isPdfFileMessage
                    ) {
                      void openDocumentInPortal(
                        msg.message,
                        fileName || 'Dokumen',
                        isPdfFileMessage
                      );
                      return;
                    }
                    openInNewTab(msg.message);
                  },
                });
              }

              if (isFileMessage) {
                menuActions.splice(1, 0, {
                  label: 'Download',
                  icon: <TbDownload className="h-4 w-4" />,
                  onClick: () => {
                    void handleDownloadMessage(msg);
                  },
                });
              }

              if (isCurrentUser && (isImageMessage || isFileMessage)) {
                menuActions.push({
                  label: 'Hapus',
                  icon: <TbTrash className="h-4 w-4" />,
                  onClick: () => {
                    void handleDeleteMessage(msg);
                  },
                  tone: 'danger',
                });
              } else if (isCurrentUser) {
                menuActions.push(
                  {
                    label: 'Edit',
                    icon: <TbPencil className="h-4 w-4" />,
                    onClick: () => handleEditMessage(msg),
                  },
                  {
                    label: 'Hapus',
                    icon: <TbTrash className="h-4 w-4" />,
                    onClick: () => {
                      void handleDeleteMessage(msg);
                    },
                    tone: 'danger',
                  }
                );
              }
              const sideMenuPositionClass =
                menuSideAnchor === 'bottom'
                  ? 'bottom-0'
                  : menuSideAnchor === 'top'
                    ? 'top-0'
                    : 'top-1/2 -translate-y-1/2';
              const sidePlacementClass =
                menuPlacement === 'left'
                  ? `right-full mr-2 ${sideMenuPositionClass} ${
                      menuSideAnchor === 'bottom'
                        ? 'origin-bottom-right'
                        : menuSideAnchor === 'top'
                          ? 'origin-top-right'
                          : 'origin-right'
                    }`
                  : menuPlacement === 'right'
                    ? `left-full ml-2 ${sideMenuPositionClass} ${
                        menuSideAnchor === 'bottom'
                          ? 'origin-bottom-left'
                          : menuSideAnchor === 'top'
                            ? 'origin-top-left'
                            : 'origin-left'
                      }`
                    : menuPlacement === 'down'
                      ? 'bottom-full mb-2 left-0 origin-bottom-left'
                      : 'top-full mt-2 left-0 origin-top-left';
              const sideArrowAnchorClass =
                menuSideAnchor === 'bottom'
                  ? 'top-[78%] -translate-y-1/2'
                  : menuSideAnchor === 'top'
                    ? 'top-[22%] -translate-y-1/2'
                    : 'top-1/2 -translate-y-1/2';

              return (
                <motion.div
                  key={animationKey}
                  initial={
                    shouldAnimateEnter
                      ? {
                          opacity: 0,
                          scale: 0.7,
                          x: isCurrentUser ? 18 : -18,
                          y: 10,
                        }
                      : false
                  }
                  animate={targetAnimation}
                  style={{
                    transformOrigin: isCurrentUser
                      ? 'right bottom'
                      : 'left bottom',
                  }}
                  transition={animationTransition}
                  onAnimationComplete={() => {
                    if (shouldAnimateOpenJump) {
                      initialOpenJumpAnimationKeysRef.current.delete(
                        animationKey
                      );
                    }
                  }}
                  className={`relative flex w-full transition-all duration-200 ease-out ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  } ${isMenuOpen || isMenuTransitionSource ? 'z-40' : 'z-0'} ${
                    openMenuMessageId &&
                    openMenuMessageId !== msg.id &&
                    !isMenuTransitionSource
                      ? 'blur-[2px] brightness-95'
                      : ''
                  }`}
                >
                  <div
                    className={`${
                      isCurrentUser
                        ? 'flex w-full max-w-xs flex-col items-end'
                        : 'flex w-full max-w-xs flex-col items-start'
                    }`}
                  >
                    <div
                      className={isFileMessage ? 'relative w-full' : 'relative'}
                    >
                      <div
                        ref={bubbleElement => {
                          if (bubbleElement) {
                            messageBubbleRefs.current.set(
                              msg.id,
                              bubbleElement
                            );
                          } else {
                            messageBubbleRefs.current.delete(msg.id);
                          }
                        }}
                        className={`${isFileMessage ? 'block w-full' : 'inline-block'} max-w-full ${
                          isImageMessage || isFileMessage
                            ? 'px-2 py-2'
                            : 'px-3 py-2'
                        } text-sm whitespace-pre-wrap break-words ${bubbleToneClass} ${bubbleOpacityClass} ${
                          isCurrentUser
                            ? 'rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                            : 'rounded-tl-xl rounded-tr-xl rounded-br-xl'
                        } cursor-pointer select-none transition-[background-color,color,opacity] duration-300 ease-in-out`}
                        style={{
                          [isCurrentUser
                            ? 'borderBottomRightRadius'
                            : 'borderBottomLeftRadius']: '2px',
                        }}
                        onClick={event => {
                          event.stopPropagation();
                          toggleMessageMenu(
                            event.currentTarget,
                            msg.id,
                            isCurrentUser ? 'left' : 'right'
                          );
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleMessageMenu(
                              event.currentTarget,
                              msg.id,
                              isCurrentUser ? 'left' : 'right'
                            );
                          }
                        }}
                      >
                        {isImageMessage ? (
                          <img
                            src={msg.message}
                            alt="Chat attachment"
                            className="max-h-72 w-auto max-w-full rounded-lg object-cover"
                            loading="lazy"
                            draggable={false}
                          />
                        ) : isPdfFileMessage ? (
                          <div className="w-full overflow-hidden rounded-lg bg-white/65 text-slate-800">
                            <div className="h-32 w-full overflow-hidden border-b border-slate-200 bg-white">
                              {resolvedPdfPreviewUrl ? (
                                <img
                                  src={resolvedPdfPreviewUrl}
                                  alt={`Preview ${fileName || 'dokumen PDF'}`}
                                  className="h-full w-full object-cover object-top"
                                  draggable={false}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <TbFileTypePdf className="h-10 w-10 text-slate-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 px-2 py-2">
                              <TbFileTypePdf className="h-8 w-8 shrink-0 text-slate-600" />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p className="block w-full truncate text-sm font-medium text-slate-800">
                                  {fileName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {pdfMetaLabel}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : isFileMessage ? (
                          <div className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-lg bg-white/65 px-2 py-2 text-slate-800">
                            {fileIcon}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="block w-full truncate text-sm font-medium text-slate-800">
                                {fileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {fileSizeLabel || fileFallbackLabel}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {displayMessage}
                            {isMessageLong ? (
                              <>
                                <span>... </span>
                                <span
                                  className={`font-medium ${
                                    isFlashingTarget
                                      ? 'text-white/95'
                                      : 'text-primary'
                                  }`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={event => {
                                    event.stopPropagation();
                                    handleToggleExpand(msg.id);
                                  }}
                                  onKeyDown={event => {
                                    if (
                                      event.key === 'Enter' ||
                                      event.key === ' '
                                    ) {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleToggleExpand(msg.id);
                                    }
                                  }}
                                >
                                  Read more
                                </span>
                              </>
                            ) : isExpanded ? (
                              <span
                                className={`block font-medium ${
                                  isFlashingTarget
                                    ? 'text-white/95'
                                    : 'text-primary'
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={event => {
                                  event.stopPropagation();
                                  handleToggleExpand(msg.id);
                                }}
                                onKeyDown={event => {
                                  if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                  ) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleToggleExpand(msg.id);
                                  }
                                }}
                              >
                                Read less
                              </span>
                            ) : null}
                          </>
                        )}
                        {hasAttachmentCaption ? (
                          <p
                            className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${
                              isFlashingTarget ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {attachmentCaptionText}
                          </p>
                        ) : null}
                      </div>

                      <PopupMenuPopover
                        isOpen={isMenuOpen}
                        menuId={msg.id}
                        disableEnterAnimation={!shouldAnimateMenuOpen}
                        layout
                        layoutId="chat-message-menu-popover"
                        initial={{
                          opacity: 0,
                          scale: 0.96,
                          x:
                            menuOffsetX +
                            (menuPlacement === 'left'
                              ? -6
                              : menuPlacement === 'right'
                                ? 6
                                : 0),
                          y:
                            menuPlacement === 'down'
                              ? 6
                              : menuPlacement === 'up'
                                ? -6
                                : 0,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          x: menuOffsetX,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.98,
                          x: menuOffsetX,
                          y: 0,
                        }}
                        transition={{
                          duration: 0.12,
                          ease: 'easeOut',
                          layout: {
                            type: 'spring',
                            stiffness: 420,
                            damping: 34,
                          },
                        }}
                        className={`absolute z-[70] text-slate-900 ${sidePlacementClass}`}
                        onClick={event => event.stopPropagation()}
                      >
                        {menuPlacement === 'left' ? (
                          <div
                            className={`absolute right-0 translate-x-full ${sideArrowAnchorClass}`}
                          >
                            <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-slate-200" />
                            <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-white left-[-1px] top-1/2 transform -translate-y-1/2" />
                          </div>
                        ) : menuPlacement === 'right' ? (
                          <div
                            className={`absolute left-0 -translate-x-full ${sideArrowAnchorClass}`}
                          >
                            <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-200" />
                            <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-white right-[-1px] top-1/2 transform -translate-y-1/2" />
                          </div>
                        ) : menuPlacement === 'down' ? (
                          <div className="absolute bottom-0 left-3 translate-y-full">
                            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-200" />
                            <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white left-1/2 top-[-1px] -translate-x-1/2" />
                          </div>
                        ) : (
                          <div className="absolute top-0 left-3 -translate-y-full">
                            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-200" />
                            <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-white left-1/2 bottom-[-1px] -translate-x-1/2" />
                          </div>
                        )}
                        <PopupMenuContent
                          actions={menuActions}
                          minWidthClassName="min-w-[120px]"
                          enableArrowNavigation
                          autoFocusFirstItem
                        />
                      </PopupMenuPopover>
                    </div>

                    <div
                      className={`flex items-center gap-2 mt-1 ${
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {isCurrentUser ? (
                        <>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {isEdited ? (
                              <>
                                <span className="text-slate-400">Diedit</span>
                                <span className="text-slate-500">•</span>
                              </>
                            ) : null}
                            {displayTime}
                          </span>
                          <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                            {displayUserPhotoUrl ? (
                              <img
                                src={displayUserPhotoUrl}
                                alt={user.name || 'You'}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            ) : (
                              <div
                                className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(user?.id || 'current_user')}`}
                              >
                                {getInitials(user?.name || 'You')}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                            {displayTargetPhotoUrl ? (
                              <img
                                src={displayTargetPhotoUrl}
                                alt={targetUser?.name || 'User'}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            ) : (
                              <div
                                className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(targetUser?.id || 'target_user')}`}
                              >
                                {getInitials(targetUser?.name || 'User')}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {displayTime}
                            {isEdited ? (
                              <>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">Diedit</span>
                              </>
                            ) : null}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </LayoutGroup>
        )}
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {showScrollToBottom && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -8, 0],
              transition: {
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
                y: {
                  repeat: Infinity,
                  duration: 1.2,
                  ease: 'easeInOut',
                },
              },
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onScrollToBottom}
            className="absolute left-2 z-20 cursor-pointer text-primary hover:text-primary/80 transition-[color,bottom] duration-[110ms] ease-out"
            style={{
              bottom: messageInputHeight + 78 + composerContextualOffset,
              filter: 'drop-shadow(0 0 0 white)',
              background:
                'radial-gradient(circle at center, white 30%, transparent 30%)',
            }}
          >
            <TbCircleArrowDownFilled size={32} />
          </motion.div>
        )}
      </AnimatePresence>

      <ImageExpandPreview
        isOpen={Boolean(imagePreviewUrl)}
        isVisible={isImagePreviewVisible}
        onClose={closeImagePreview}
        backdropClassName="z-[79] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            closeImagePreview();
          }
        }}
      >
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt={imagePreviewName || 'Preview gambar'}
            className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
            draggable={false}
          />
        ) : null}
      </ImageExpandPreview>

      <DocumentPreviewPortal
        isOpen={Boolean(documentPreviewUrl)}
        isVisible={isDocumentPreviewVisible}
        previewUrl={documentPreviewUrl}
        previewName={documentPreviewName}
        onClose={closeDocumentPreview}
        backdropClassName="z-[80] px-4 py-6"
        iframeTitle="Preview dokumen"
      />
    </>
  );
};

export default MessagesPane;
