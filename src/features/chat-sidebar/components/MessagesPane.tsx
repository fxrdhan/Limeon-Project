import { LayoutGroup } from 'motion/react';
import type { MutableRefObject, RefObject } from 'react';
import { TbArrowDown } from 'react-icons/tb';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { MAX_MESSAGE_CHARS } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { useChatMessagesModel } from '../hooks/useChatMessagesModel';
import type { PdfMessagePreview } from '../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../types';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MessageItem from './messages/MessageItem';

interface ChatPanelUser {
  id?: string;
  name?: string;
}

export interface MessagesPaneModel {
  loading: boolean;
  loadError: string | null;
  messages: ChatMessage[];
  user?: ChatPanelUser | null;
  normalizedSearchQuery: string;
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
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  showScrollToBottom: boolean;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  olderMessagesError: string | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  captionMessagesByAttachmentId: Map<string, ChatMessage>;
  captionMessageIds: Set<string>;
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
  getImageMessageUrl: (
    message: Pick<ChatMessage, 'id' | 'message' | 'message_type'>
  ) => string | null;
  getPdfMessagePreview: (
    message: ChatMessage,
    fileName: string | null
  ) => PdfMessagePreview | undefined;
  documentPreviewUrl: string | null;
  documentPreviewName: string;
  isDocumentPreviewVisible: boolean;
  closeDocumentPreview: () => void;
  imagePreviewUrl: string | null;
  imagePreviewName: string;
  isImagePreviewVisible: boolean;
  closeImagePreview: () => void;
  openImageInPortal: (
    message: Pick<
      ChatMessage,
      'message' | 'file_storage_path' | 'file_mime_type'
    >,
    previewName: string
  ) => Promise<void>;
  openDocumentInPortal: (
    message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
  onScrollToBottom: () => void;
  onLoadOlderMessages: () => void;
  onRetryLoadMessages: () => void;
}

const MessagesPaneContent = ({ model }: { model: MessagesPaneModel }) => {
  const {
    loading,
    loadError,
    messages,
    user,
    normalizedSearchQuery,
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
    searchMatchedMessageIds,
    activeSearchMessageId,
    showScrollToBottom,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    messagesContainerRef,
    messagesEndRef,
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    captionMessagesByAttachmentId,
    captionMessageIds,
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
    getImageMessageUrl,
    getPdfMessagePreview,
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
    onScrollToBottom,
    onLoadOlderMessages,
    onRetryLoadMessages,
  } = model;

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
        ) : loadError && messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="max-w-xs rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
            <button
              type="button"
              onClick={onRetryLoadMessages}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <LayoutGroup id="chat-message-menus">
            {loadError ? (
              <div className="pb-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span>{loadError}</span>
                  <button
                    type="button"
                    onClick={onRetryLoadMessages}
                    className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-medium text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    Muat ulang
                  </button>
                </div>
              </div>
            ) : null}
            {hasOlderMessages ? (
              <div className="flex flex-col items-center gap-1 pb-1">
                <button
                  type="button"
                  onClick={onLoadOlderMessages}
                  disabled={isLoadingOlderMessages}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-60"
                >
                  {isLoadingOlderMessages
                    ? 'Loading older messages...'
                    : 'Load older messages'}
                </button>
                {olderMessagesError ? (
                  <p className="text-[11px] text-rose-600">
                    {olderMessagesError}
                  </p>
                ) : null}
              </div>
            ) : null}
            {messages.map(messageItem => {
              if (captionMessageIds.has(messageItem.id)) {
                return null;
              }

              return (
                <MessageItem
                  key={messageItem.stableKey || messageItem.id}
                  model={{
                    message: messageItem,
                    resolvedMessageUrl:
                      messageItem.message_type === 'image'
                        ? getImageMessageUrl(messageItem)
                        : messageItem.message,
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
                      getAttachmentFileName(messageItem)
                    ),
                    onToggleMessageSelection,
                    toggleMessageMenu,
                    handleToggleExpand,
                    handleEditMessage,
                    handleCopyMessage,
                    handleDownloadMessage,
                    handleDeleteMessage,
                    getAttachmentFileName,
                    getAttachmentFileKind,
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

const MessagesPaneWithControllerModel = () => {
  const model = useChatMessagesModel();
  return <MessagesPaneContent model={model} />;
};

const MessagesPane = ({ model }: { model?: MessagesPaneModel }) =>
  model ? (
    <MessagesPaneContent model={model} />
  ) : (
    <MessagesPaneWithControllerModel />
  );

export default MessagesPane;
