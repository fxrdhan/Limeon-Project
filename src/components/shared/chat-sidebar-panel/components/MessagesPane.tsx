import { LayoutGroup } from 'motion/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { TbArrowDown } from 'react-icons/tb';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import type { ChatMessage } from '@/services/api/chat.service';
import { useMessagePdfPreviews } from '../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../types';
import { getAttachmentCaptionData } from '../utils/message-derivations';
import { fetchPdfBlobWithFallback } from '../utils/message-file';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MessageItem from './messages/MessageItem';

interface ChatPanelUser {
  id?: string;
  name?: string;
}

interface MessagesPaneProps {
  loading: boolean;
  messages: ChatMessage[];
  user?: ChatPanelUser | null;
  messageInputHeight: number;
  composerContextualOffset: number;
  composerContainerHeight: number;
  openMenuMessageId: string | null;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  searchQuery: string;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
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
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
  onToggleMessageSelection: (messageId: string) => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  onScrollToBottom: () => void;
}

const MessagesPane = ({
  loading,
  messages,
  user,
  messageInputHeight,
  composerContextualOffset,
  composerContainerHeight,
  openMenuMessageId,
  menuPlacement,
  menuSideAnchor,
  shouldAnimateMenuOpen,
  menuTransitionSourceId,
  menuOffsetX,
  expandedMessageIds,
  flashingMessageId,
  isFlashHighlightVisible,
  isSelectionMode,
  selectedMessageIds,
  searchQuery,
  searchMatchedMessageIds,
  activeSearchMessageId,
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
  onToggleMessageSelection,
  getAttachmentFileName,
  getAttachmentFileKind,
  onScrollToBottom,
}: MessagesPaneProps) => {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const { getPdfMessagePreview } = useMessagePdfPreviews({
    messages,
    getAttachmentFileName,
    getAttachmentFileKind,
  });
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
  const { captionMessagesByAttachmentId, captionMessageIds } = useMemo(
    () => getAttachmentCaptionData(messages),
    [messages]
  );

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
    return () => {
      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      if (documentPreviewCloseTimerRef.current) {
        window.clearTimeout(documentPreviewCloseTimerRef.current);
        documentPreviewCloseTimerRef.current = null;
      }
      releaseDocumentPreviewObjectUrl();
    };
  }, [releaseDocumentPreviewObjectUrl]);

  return (
    <>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-x-hidden px-3 pt-20 overflow-y-auto space-y-3 transition-[padding-bottom] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          overflowAnchor: 'none',
          paddingBottom: messageInputHeight + 84 + composerContextualOffset,
        }}
        onClick={closeMessageMenu}
        role="presentation"
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-slate-400 text-sm">Loading messages...</div>
          </div>
        ) : (
          <LayoutGroup id="chat-message-menus">
            {messages.map(messageItem => {
              if (captionMessageIds.has(messageItem.id)) {
                return null;
              }

              return (
                <MessageItem
                  key={messageItem.stableKey || messageItem.id}
                  message={messageItem}
                  userId={user?.id}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedMessageIds.has(messageItem.id)}
                  openMenuMessageId={openMenuMessageId}
                  menuPlacement={menuPlacement}
                  menuSideAnchor={menuSideAnchor}
                  shouldAnimateMenuOpen={shouldAnimateMenuOpen}
                  menuTransitionSourceId={menuTransitionSourceId}
                  menuOffsetX={menuOffsetX}
                  expandedMessageIds={expandedMessageIds}
                  flashingMessageId={flashingMessageId}
                  isFlashHighlightVisible={isFlashHighlightVisible}
                  searchMatchedMessageIds={searchMatchedMessageIds}
                  activeSearchMessageId={activeSearchMessageId}
                  maxMessageChars={maxMessageChars}
                  messageBubbleRefs={messageBubbleRefs}
                  initialMessageAnimationKeysRef={
                    initialMessageAnimationKeysRef
                  }
                  initialOpenJumpAnimationKeysRef={
                    initialOpenJumpAnimationKeysRef
                  }
                  captionMessage={captionMessagesByAttachmentId.get(
                    messageItem.id
                  )}
                  pdfMessagePreview={getPdfMessagePreview(
                    messageItem,
                    getAttachmentFileName(messageItem)
                  )}
                  onToggleMessageSelection={onToggleMessageSelection}
                  toggleMessageMenu={toggleMessageMenu}
                  handleToggleExpand={handleToggleExpand}
                  handleEditMessage={handleEditMessage}
                  handleCopyMessage={handleCopyMessage}
                  handleDownloadMessage={handleDownloadMessage}
                  handleDeleteMessage={handleDeleteMessage}
                  getAttachmentFileName={getAttachmentFileName}
                  getAttachmentFileKind={getAttachmentFileKind}
                  normalizedSearchQuery={normalizedSearchQuery}
                  openImageInPortal={openImageInPortal}
                  openDocumentInPortal={openDocumentInPortal}
                />
              );
            })}
          </LayoutGroup>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollToBottom && messages.length > 0 ? (
        <button
          type="button"
          onClick={onScrollToBottom}
          aria-label="Scroll ke pesan terbaru"
          className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-xl bg-white text-black shadow-sm transition-colors hover:text-black/80"
          style={{
            bottom: Math.max(composerContainerHeight + 24, 46),
          }}
        >
          <TbArrowDown size={18} />
        </button>
      ) : null}

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
