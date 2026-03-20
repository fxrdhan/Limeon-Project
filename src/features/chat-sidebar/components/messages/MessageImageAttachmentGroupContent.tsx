import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { MenuPlacement, MenuSideAnchor } from '../../types';
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

interface MessageImageAttachmentGroupContentProps {
  messages: ChatMessage[];
  userId?: string;
  captionMessage?: ChatMessage;
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
      'id' | 'message' | 'message_type' | 'file_name' | 'file_mime_type'
    >
  ) => string | null;
  openImageInPortal: (
    message: Pick<
      ChatMessage,
      'message' | 'file_storage_path' | 'file_mime_type'
    >,
    previewName: string
  ) => Promise<void>;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

const MAX_VISIBLE_IMAGE_GROUP_TILES = 4;

const getImagePreviewName = (message: ChatMessage, fallbackIndex: number) => {
  const explicitName = message.file_name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const pathName = message.message.split('/').pop()?.split('?')[0]?.trim();
  if (pathName) {
    return pathName;
  }

  return `Gambar ${fallbackIndex + 1}`;
};

export const MessageImageAttachmentGroupContent = ({
  messages,
  userId,
  captionMessage,
  isHighlightedBubble,
  openMenuMessageId,
  menuPlacement,
  menuSideAnchor,
  menuOffsetX,
  shouldAnimateMenuOpen,
  toggleMessageMenu,
  getImageMessageUrl,
  openImageInPortal,
  handleCopyMessage,
  handleDownloadMessage,
  handleOpenForwardMessagePicker,
  handleDeleteMessage,
}: MessageImageAttachmentGroupContentProps) => {
  const isCurrentUserGroup = messages[0]?.sender_id === userId;
  const { sidePlacementClass, sideArrowAnchorClass } = getMessageMenuClasses(
    menuPlacement,
    menuSideAnchor
  );
  const openMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] =
    useState<AttachmentMenuAnchorPosition | null>(null);
  const visibleMessages = messages.slice(0, MAX_VISIBLE_IMAGE_GROUP_TILES);
  const hiddenImageCount = messages.length - visibleMessages.length;
  const openGroupedMenuMessageId =
    openMenuMessageId &&
    visibleMessages.some(message => message.id === openMenuMessageId)
      ? openMenuMessageId
      : null;

  useEffect(() => {
    if (!openGroupedMenuMessageId) {
      setMenuAnchorPosition(null);
      return;
    }

    const syncMenuAnchorPosition = () => {
      const triggerElement = openMenuTriggerRef.current;
      if (!triggerElement) {
        setMenuAnchorPosition(null);
        return;
      }

      const rect = triggerElement.getBoundingClientRect();
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
  }, [openGroupedMenuMessageId]);

  const imageTiles = visibleMessages.map((message, index) => {
    const resolvedMessageUrl = getImageMessageUrl(message);
    const previewName = getImagePreviewName(message, index);
    const menuActions = buildMessageMenuActions({
      message,
      resolvedMessageUrl,
      isCurrentUser: message.sender_id === userId,
      isImageMessage: true,
      isFileMessage: false,
      isImageFileMessage: false,
      isPdfFileMessage: false,
      fileKind: 'document',
      fileName: previewName,
      openImageInPortal,
      openDocumentInPortal: async () => {},
      handleEditMessage: () => {},
      handleCopyMessage,
      handleDownloadMessage,
      handleOpenForwardMessagePicker,
      handleDeleteMessage,
    });

    return {
      message,
      resolvedMessageUrl,
      previewName,
      menuActions,
      isOverflowTile:
        hiddenImageCount > 0 && index === visibleMessages.length - 1,
    };
  });

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
        <div className="grid aspect-square grid-cols-2 gap-[2px] bg-slate-200">
          {imageTiles.map(
            ({ message, resolvedMessageUrl, previewName, isOverflowTile }) => {
              const isMenuOpen = openGroupedMenuMessageId === message.id;
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
                  <button
                    ref={isMenuOpen ? openMenuTriggerRef : undefined}
                    type="button"
                    aria-label="Aksi gambar"
                    title="Aksi gambar"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    onClick={event => {
                      event.stopPropagation();

                      const rect = event.currentTarget.getBoundingClientRect();
                      setMenuAnchorPosition({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                      });
                      toggleMessageMenu(
                        event.currentTarget,
                        message.id,
                        isCurrentUserGroup ? 'left' : 'right'
                      );
                    }}
                    className="relative block aspect-square w-full cursor-pointer overflow-hidden bg-slate-100 text-left"
                  >
                    {resolvedMessageUrl ? (
                      <img
                        src={resolvedMessageUrl}
                        alt={`Preview ${previewName}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-center text-xs text-slate-400">
                        Memuat gambar...
                      </div>
                    )}
                    {isOverflowTile ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/52 text-[1.75rem] font-semibold text-white">
                        +{hiddenImageCount}
                      </div>
                    ) : null}
                  </button>
                </div>
              );
            }
          )}
        </div>
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
                  actions={
                    imageTiles.find(
                      imageTile =>
                        imageTile.message.id === openGroupedMenuMessageId
                    )?.menuActions ?? []
                  }
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
