import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { MenuPlacement, MenuSideAnchor } from '../../types';
import { getChatImagePreviewName } from '../../utils/message-preview-assets';
import { renderHighlightedText } from '../../utils/message-search';
import { MessageActionPopover } from './MessageActionPopover';
import {
  buildMessageMenuActions,
  getMessageMenuClasses,
} from './messageItemUtils';

interface AttachmentMenuAnchorPosition {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface ImagePreviewIntrinsicDimensions {
  width: number;
  height: number;
}

interface MessageImageAttachmentGroupContentProps {
  messages: ChatMessage[];
  menuAnchorRef: RefObject<HTMLDivElement | null>;
  userId?: string;
  captionMessage?: ChatMessage;
  isSelectionMode: boolean;
  isHighlightedBubble: boolean;
  openMenuMessageId: string | null;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  menuOffsetX: number;
  shouldAnimateMenuOpen: boolean;
  toggleMessageMenu: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
  getImageMessageUrl: (
    message: Pick<
      ChatMessage,
      | 'id'
      | 'message'
      | 'message_type'
      | 'file_name'
      | 'file_mime_type'
      | 'file_preview_url'
    >
  ) => string | null;
  openImageGroupInPortal: (
    messages: Array<
      Pick<
        ChatMessage,
        | 'id'
        | 'message'
        | 'file_storage_path'
        | 'file_mime_type'
        | 'file_name'
        | 'file_preview_url'
      > & {
        previewUrl?: string | null;
      }
    >,
    initialMessageId?: string | null,
    initialPreviewUrl?: string | null,
    initialPreviewIntrinsicDimensions?: ImagePreviewIntrinsicDimensions | null
  ) => Promise<void>;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadImageGroup: (targetMessages: ChatMessage[]) => Promise<void>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

const MAX_VISIBLE_IMAGE_GROUP_TILES = 4;

export const MessageImageAttachmentGroupContent = ({
  messages,
  menuAnchorRef,
  userId,
  captionMessage,
  isSelectionMode,
  isHighlightedBubble,
  openMenuMessageId,
  menuPlacement,
  menuSideAnchor,
  menuOffsetX,
  shouldAnimateMenuOpen,
  toggleMessageMenu,
  getImageMessageUrl,
  openImageGroupInPortal,
  handleCopyMessage,
  handleDownloadMessage,
  handleDownloadImageGroup,
  handleOpenForwardMessagePicker,
  handleDeleteMessage,
}: MessageImageAttachmentGroupContentProps) => {
  const groupPreviewMessages = messages.map(message => ({
    id: message.id,
    message: message.message,
    file_storage_path: message.file_storage_path,
    file_mime_type: message.file_mime_type,
    file_name: message.file_name,
    file_preview_url: message.file_preview_url,
    previewUrl: getImageMessageUrl(message),
  }));
  const representativeMessage = messages[messages.length - 1] ?? null;
  const initialPreviewMessage = groupPreviewMessages[0] ?? null;
  const isCurrentUserGroup = messages[0]?.sender_id === userId;
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    menuPlacement,
    menuSideAnchor
  );
  const previewDimensionsByMessageIdRef = useRef<
    Map<string, ImagePreviewIntrinsicDimensions>
  >(new Map());
  const [menuAnchorPosition, setMenuAnchorPosition] =
    useState<AttachmentMenuAnchorPosition | null>(null);
  const visibleMessages = messages.slice(0, MAX_VISIBLE_IMAGE_GROUP_TILES);
  const hiddenImageCount = messages.length - visibleMessages.length;
  const openGroupedMenuMessageId =
    representativeMessage && openMenuMessageId === representativeMessage.id
      ? representativeMessage.id
      : null;

  useEffect(() => {
    if (!openGroupedMenuMessageId) {
      setMenuAnchorPosition(null);
      return;
    }

    const syncMenuAnchorPosition = () => {
      const anchorElement = menuAnchorRef.current;
      if (!anchorElement) {
        setMenuAnchorPosition(null);
        return;
      }

      const rect = anchorElement.getBoundingClientRect();
      setMenuAnchorPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    syncMenuAnchorPosition();
    window.addEventListener('resize', syncMenuAnchorPosition);
    window.addEventListener('scroll', syncMenuAnchorPosition, true);

    return () => {
      window.removeEventListener('resize', syncMenuAnchorPosition);
      window.removeEventListener('scroll', syncMenuAnchorPosition, true);
    };
  }, [menuAnchorRef, openGroupedMenuMessageId]);

  const imageTiles = visibleMessages.map((message, index) => ({
    message,
    resolvedMessageUrl: getImageMessageUrl(message),
    previewName: getChatImagePreviewName(message, index),
    isOverflowTile:
      hiddenImageCount > 0 && index === visibleMessages.length - 1,
  }));
  const groupMenuActions = representativeMessage
    ? buildMessageMenuActions({
        message: representativeMessage,
        isCurrentUser: representativeMessage.sender_id === userId,
        isImageMessage: true,
        isFileMessage: false,
        isImageFileMessage: false,
        isPdfFileMessage: false,
        fileKind: 'document',
        fileName:
          getChatImagePreviewName(
            representativeMessage,
            messages.length > 0 ? messages.length - 1 : 0
          ) || 'Gambar',
        openImageInPortal: async () => {
          await openImageGroupInPortal(
            groupPreviewMessages,
            initialPreviewMessage?.id || representativeMessage.id,
            initialPreviewMessage?.previewUrl || null,
            (initialPreviewMessage
              ? previewDimensionsByMessageIdRef.current.get(
                  initialPreviewMessage.id
                )
              : null) || null
          );
        },
        openDocumentInPortal: async () => {},
        handleEditMessage: () => {},
        handleCopyMessage,
        handleDownloadMessage,
        handleOpenForwardMessagePicker,
        handleDeleteMessage,
      }).map(action =>
        action.label === 'Unduh'
          ? {
              ...action,
              onClick: () => {
                void handleDownloadImageGroup(messages);
              },
            }
          : action
      )
    : [];

  const captionText = captionMessage?.message?.trim() ?? '';
  const highlightedCaption = renderHighlightedText(captionText, '', {
    linkify: true,
  });

  return (
    <div>
      <div
        data-chat-image-group-grid
        className="overflow-hidden rounded-xl bg-slate-200"
      >
        <button
          type="button"
          aria-label="Aksi grup gambar"
          title="Aksi grup gambar"
          aria-haspopup={isSelectionMode ? undefined : 'menu'}
          aria-expanded={
            isSelectionMode
              ? undefined
              : openGroupedMenuMessageId === representativeMessage?.id
          }
          disabled={isSelectionMode || !representativeMessage}
          onClick={event => {
            if (isSelectionMode || !representativeMessage) {
              return;
            }

            event.stopPropagation();

            const anchorElement = menuAnchorRef.current ?? event.currentTarget;
            const rect = anchorElement.getBoundingClientRect();
            setMenuAnchorPosition({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            });
            toggleMessageMenu(
              anchorElement,
              representativeMessage.id,
              isCurrentUserGroup ? 'left' : 'right'
            );
          }}
          className={`grid aspect-square w-full gap-[2px] bg-slate-200 text-left ${
            isSelectionMode ? 'cursor-inherit' : 'cursor-pointer'
          }`}
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          {imageTiles.map(
            ({ message, resolvedMessageUrl, previewName, isOverflowTile }) => {
              const isMenuOpen =
                openGroupedMenuMessageId === representativeMessage?.id;
              const isAnotherAttachmentFocused =
                openGroupedMenuMessageId !== null && !isMenuOpen;

              return (
                <div
                  key={message.id}
                  data-chat-image-group-tile-id={message.id}
                  className={`relative overflow-visible transition-[filter,opacity,transform] duration-150 ${
                    isMenuOpen ? 'z-[80]' : 'z-0'
                  } ${
                    isAnotherAttachmentFocused ? 'blur-[2px] brightness-95' : ''
                  }`}
                >
                  <div className="relative block aspect-square w-full overflow-hidden bg-slate-100 text-left">
                    {resolvedMessageUrl ? (
                      <img
                        src={resolvedMessageUrl}
                        alt={`Preview ${previewName}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        draggable={false}
                        ref={imageElement => {
                          if (
                            !imageElement?.naturalWidth ||
                            !imageElement.naturalHeight
                          ) {
                            return;
                          }

                          previewDimensionsByMessageIdRef.current.set(
                            message.id,
                            {
                              width: imageElement.naturalWidth,
                              height: imageElement.naturalHeight,
                            }
                          );
                        }}
                        onLoad={event => {
                          const imageElement = event.currentTarget;
                          if (
                            !imageElement.naturalWidth ||
                            !imageElement.naturalHeight
                          ) {
                            return;
                          }

                          previewDimensionsByMessageIdRef.current.set(
                            message.id,
                            {
                              width: imageElement.naturalWidth,
                              height: imageElement.naturalHeight,
                            }
                          );
                        }}
                      />
                    ) : (
                      <div
                        className="h-full w-full bg-slate-100"
                        aria-hidden="true"
                      />
                    )}
                    {isOverflowTile ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/52 text-[1.75rem] font-semibold text-white">
                        +{hiddenImageCount}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }
          )}
        </button>
      </div>

      {typeof document !== 'undefined' &&
      openGroupedMenuMessageId &&
      menuAnchorPosition
        ? createPortal(
            <motion.div
              initial={false}
              animate={{
                top: menuAnchorPosition.top,
                left: menuAnchorPosition.left,
                width: menuAnchorPosition.width,
                height: menuAnchorPosition.height,
              }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 34,
              }}
              className="pointer-events-none fixed z-[70]"
            >
              <div
                className="pointer-events-auto relative h-full w-full"
                onClick={event => event.stopPropagation()}
                role="presentation"
              >
                <MessageActionPopover
                  isOpen
                  menuId={openGroupedMenuMessageId}
                  shouldAnimateMenuOpen={shouldAnimateMenuOpen}
                  menuPlacement={menuPlacement}
                  menuOffsetX={menuOffsetX}
                  sidePlacementClass={sidePlacementClass}
                  sideArrowAnchorClass={sideArrowAnchorClass}
                  actions={groupMenuActions}
                />
              </div>
            </motion.div>,
            document.body
          )
        : null}

      {captionText ? (
        <p
          className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${
            isHighlightedBubble ? 'text-white' : 'text-slate-800'
          }`}
          style={{
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {highlightedCaption}
        </p>
      ) : null}
    </div>
  );
};
