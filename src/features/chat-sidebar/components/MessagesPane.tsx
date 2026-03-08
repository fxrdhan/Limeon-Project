import { LayoutGroup } from 'motion/react';
import { useMemo, type MutableRefObject, type RefObject } from 'react';
import { TbArrowDown } from 'react-icons/tb';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { MAX_MESSAGE_CHARS } from '../constants';
import { useMessagesPanePreviews } from '../hooks/useMessagesPanePreviews';
import { useMessagePdfPreviews } from '../hooks/useMessagePdfPreviews';
import { useStableMessageActionHandlers } from '../hooks/useStableMessageActionHandlers';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../types';
import { getAttachmentCaptionData } from '../utils/message-derivations';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MessageItem from './messages/MessageItem';

interface ChatPanelUser {
  id?: string;
  name?: string;
}

export interface MessagesPaneModel {
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

const MessagesPane = ({ model }: { model: MessagesPaneModel }) => {
  const {
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
  } = model;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const {
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
    imagePreviewUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    openImageInPortal,
    openDocumentInPortal,
  } = useMessagesPanePreviews();
  const { getPdfMessagePreview } = useMessagePdfPreviews({
    messages,
    getAttachmentFileName,
    getAttachmentFileKind,
  });
  const { captionMessagesByAttachmentId, captionMessageIds } = useMemo(
    () => getAttachmentCaptionData(messages),
    [messages]
  );
  const {
    handleToggleMessageSelectionStable,
    toggleMessageMenuStable,
    handleToggleExpandStable,
    handleEditMessageStable,
    handleCopyMessageStable,
    handleDownloadMessageStable,
    handleDeleteMessageStable,
    getAttachmentFileNameStable,
    getAttachmentFileKindStable,
  } = useStableMessageActionHandlers({
    onToggleMessageSelection,
    toggleMessageMenu,
    handleToggleExpand,
    handleEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleDeleteMessage,
    getAttachmentFileName,
    getAttachmentFileKind,
  });

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
                  model={{
                    message: messageItem,
                    userId: user?.id,
                    isSelectionMode,
                    isSelected: selectedMessageIds.has(messageItem.id),
                    openMenuMessageId,
                    menuPlacement,
                    menuSideAnchor,
                    shouldAnimateMenuOpen,
                    menuTransitionSourceId,
                    menuOffsetX,
                    expandedMessageIds,
                    flashingMessageId,
                    isFlashHighlightVisible,
                    searchMatchedMessageIds,
                    activeSearchMessageId,
                    maxMessageChars: MAX_MESSAGE_CHARS,
                    messageBubbleRefs,
                    initialMessageAnimationKeysRef,
                    initialOpenJumpAnimationKeysRef,
                    captionMessage: captionMessagesByAttachmentId.get(
                      messageItem.id
                    ),
                    pdfMessagePreview: getPdfMessagePreview(
                      messageItem,
                      getAttachmentFileNameStable(messageItem)
                    ),
                    onToggleMessageSelection:
                      handleToggleMessageSelectionStable,
                    toggleMessageMenu: toggleMessageMenuStable,
                    handleToggleExpand: handleToggleExpandStable,
                    handleEditMessage: handleEditMessageStable,
                    handleCopyMessage: handleCopyMessageStable,
                    handleDownloadMessage: handleDownloadMessageStable,
                    handleDeleteMessage: handleDeleteMessageStable,
                    getAttachmentFileName: getAttachmentFileNameStable,
                    getAttachmentFileKind: getAttachmentFileKindStable,
                    normalizedSearchQuery,
                    openImageInPortal,
                    openDocumentInPortal,
                  }}
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
