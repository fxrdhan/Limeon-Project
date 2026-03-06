import { motion } from 'motion/react';
import type { MutableRefObject } from 'react';
import {
  TbCheck,
  TbChecks,
  TbClock,
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
import type { ChatMessage } from '@/services/api/chat.service';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../../types';
import {
  formatFileFallbackLabel,
  formatFileSize,
  isImageFileExtensionOrMime,
  openInNewTab,
  resolveFileExtension,
} from '../../utils/message-file';
import {
  buildCollapsedSearchSnippet,
  renderHighlightedText,
} from '../../utils/message-search';

interface MessageItemProps {
  message: ChatMessage;
  userId?: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  openMenuMessageId: string | null;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  maxMessageChars: number;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  captionMessage?: ChatMessage;
  pdfMessagePreview?: PdfMessagePreview;
  onToggleMessageSelection: (messageId: string) => void;
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
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  normalizedSearchQuery: string;
  openImageInPortal: (url: string, previewName: string) => void;
  openDocumentInPortal: (
    url: string,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
}

const getFileIcon = (fileExtension: string, isAudioFileMessage: boolean) => {
  if (isAudioFileMessage) {
    return <TbMusic className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
    return <TbFileTypeJpg className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'png') {
    return <TbFileTypePng className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'pdf') {
    return <TbFileTypePdf className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'docx') {
    return <TbFileTypeDocx className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'doc') {
    return <TbFileTypeDoc className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'csv') {
    return <TbFileTypeCsv className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'ppt' || fileExtension === 'pptx') {
    return <TbFileTypePpt className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'txt') {
    return <TbFileTypeTxt className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'zip') {
    return <TbFileTypeZip className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (
    fileExtension === 'xls' ||
    fileExtension === 'xlsx' ||
    fileExtension === 'x'
  ) {
    return <TbFileTypeXls className="h-8 w-8 shrink-0 text-slate-600" />;
  }

  return <TbFileUnknown className="h-8 w-8 shrink-0 text-slate-600" />;
};

const MessageItem = ({
  message,
  userId,
  isSelectionMode,
  isSelected,
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
  maxMessageChars,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  captionMessage,
  pdfMessagePreview,
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
}: MessageItemProps) => {
  const isCurrentUser = message.sender_id === userId;
  const attachmentCaptionText = captionMessage?.message?.trim() ?? '';
  const hasAttachmentCaption =
    (message.message_type === 'image' || message.message_type === 'file') &&
    attachmentCaptionText.length > 0;
  const displayTime = new Date(message.created_at).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const createdTimestamp = new Date(message.created_at).getTime();
  const updatedTimestamp = new Date(message.updated_at).getTime();
  const isTextMessage = message.message_type === 'text';
  const isEdited =
    isTextMessage &&
    Number.isFinite(createdTimestamp) &&
    Number.isFinite(updatedTimestamp) &&
    updatedTimestamp > createdTimestamp;
  const messageDeliveryStatus = isCurrentUser
    ? message.id.startsWith('temp_')
      ? 'sending'
      : message.is_read
        ? 'read'
        : message.is_delivered
          ? 'delivered'
          : 'sent'
    : null;
  const isMenuOpen = openMenuMessageId === message.id;
  const isMenuTransitionSource = menuTransitionSourceId === message.id;
  const isFlashSequenceTarget = flashingMessageId === message.id;
  const isFlashingTarget = isFlashSequenceTarget && isFlashHighlightVisible;
  const isSearchMatch = searchMatchedMessageIds.has(message.id);
  const isActiveSearchMatch = activeSearchMessageId === message.id;
  const isImageMessage = message.message_type === 'image';
  const isFileMessage = message.message_type === 'file';
  const fileKind = isFileMessage ? getAttachmentFileKind(message) : 'document';
  const isAudioFileMessage = isFileMessage && fileKind === 'audio';
  const fileName = isFileMessage ? getAttachmentFileName(message) : null;
  const fileExtension = isFileMessage
    ? resolveFileExtension(fileName, message.message, message.file_mime_type)
    : '';
  const fileSizeLabel = isFileMessage
    ? formatFileSize(message.file_size)
    : null;
  const fileFallbackLabel = isFileMessage
    ? formatFileFallbackLabel(fileExtension, fileKind)
    : null;
  const isPdfFileMessage =
    isFileMessage &&
    !isAudioFileMessage &&
    (fileExtension === 'pdf' ||
      message.file_mime_type?.toLowerCase().includes('pdf') === true);
  const isImageFileMessage =
    isFileMessage &&
    !isAudioFileMessage &&
    isImageFileExtensionOrMime(fileExtension, message.file_mime_type);
  const persistedPdfPreviewUrl = isPdfFileMessage
    ? message.file_preview_url?.trim() || null
    : null;
  const resolvedPdfPreviewUrl =
    persistedPdfPreviewUrl || pdfMessagePreview?.coverDataUrl || null;
  const resolvedPdfPageCount = isPdfFileMessage
    ? (message.file_preview_page_count ?? pdfMessagePreview?.pageCount)
    : null;
  const pdfMetaLabel = isPdfFileMessage
    ? [
        resolvedPdfPageCount ? `${resolvedPdfPageCount} halaman` : null,
        'PDF',
        fileSizeLabel,
      ]
        .filter(Boolean)
        .join(' · ') || 'PDF'
    : null;
  const fileIcon = getFileIcon(fileExtension, isAudioFileMessage);
  const bubbleToneClass = isFlashingTarget
    ? 'bg-primary text-white'
    : isCurrentUser
      ? 'bg-emerald-200 text-slate-900'
      : 'bg-white text-slate-800';
  const bubbleOpacityClass = isFlashSequenceTarget
    ? isFlashHighlightVisible
      ? 'opacity-100'
      : 'opacity-60'
    : 'opacity-100';
  const animationKey = message.stableKey || message.id;
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
  const isExpanded = expandedMessageIds.has(message.id);
  const isMessageLong =
    !isImageMessage &&
    !isFileMessage &&
    !isExpanded &&
    message.message.length > maxMessageChars;
  const bubbleWrapperClass = isFileMessage
    ? 'block w-full'
    : isImageMessage
      ? 'inline-flex flex-col align-top'
      : 'inline-block';
  const bubbleSpacingClass = isImageMessage
    ? hasAttachmentCaption
      ? 'px-2 py-2'
      : 'p-0 overflow-hidden'
    : isFileMessage
      ? 'px-2 py-2'
      : 'px-3 py-2';
  const bubbleTypographyClass =
    isImageMessage || isFileMessage
      ? ''
      : 'text-sm whitespace-pre-wrap break-words';
  const collapsedSearchSnippet = buildCollapsedSearchSnippet(
    message.message,
    normalizedSearchQuery,
    maxMessageChars
  );
  const displayMessage = isMessageLong
    ? collapsedSearchSnippet.text
    : message.message;
  const highlightedMessage = renderHighlightedText(
    displayMessage,
    normalizedSearchQuery
  );
  const highlightedCaption = renderHighlightedText(
    attachmentCaptionText,
    normalizedSearchQuery
  );
  const menuActions: PopupMenuAction[] = [
    {
      label: 'Salin',
      icon: <TbCopy className="h-4 w-4" />,
      onClick: () => {
        void handleCopyMessage(message);
      },
    },
  ];

  if (isImageMessage || isFileMessage) {
    menuActions.unshift({
      label: 'Buka',
      icon: <TbEye className="h-4 w-4" />,
      onClick: () => {
        if (isImageMessage || isImageFileMessage) {
          openImageInPortal(message.message, fileName || 'Gambar');
          return;
        }
        if (isFileMessage && fileKind === 'document' && isPdfFileMessage) {
          void openDocumentInPortal(
            message.message,
            fileName || 'Dokumen',
            isPdfFileMessage
          );
          return;
        }
        openInNewTab(message.message);
      },
    });
  }

  if (isFileMessage) {
    menuActions.splice(1, 0, {
      label: 'Download',
      icon: <TbDownload className="h-4 w-4" />,
      onClick: () => {
        void handleDownloadMessage(message);
      },
    });
  }

  if (isCurrentUser && (isImageMessage || isFileMessage)) {
    menuActions.push({
      label: 'Hapus',
      icon: <TbTrash className="h-4 w-4" />,
      onClick: () => {
        void handleDeleteMessage(message);
      },
      tone: 'danger',
    });
  } else if (isCurrentUser) {
    menuActions.push(
      {
        label: 'Edit',
        icon: <TbPencil className="h-4 w-4" />,
        onClick: () => handleEditMessage(message),
      },
      {
        label: 'Hapus',
        icon: <TbTrash className="h-4 w-4" />,
        onClick: () => {
          void handleDeleteMessage(message);
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
        transformOrigin: isCurrentUser ? 'right bottom' : 'left bottom',
      }}
      transition={animationTransition}
      onAnimationComplete={() => {
        if (shouldAnimateOpenJump) {
          initialOpenJumpAnimationKeysRef.current.delete(animationKey);
        }
      }}
      className={`relative flex w-full ${
        isCurrentUser ? 'justify-end' : 'justify-start'
      } ${isMenuOpen ? 'z-50' : isMenuTransitionSource ? 'z-40' : 'z-0'} ${
        !isSelectionMode &&
        openMenuMessageId &&
        openMenuMessageId !== message.id
          ? 'blur-[2px] brightness-95'
          : ''
      } ${
        isSelectionMode
          ? isSelected
            ? 'cursor-pointer rounded-lg bg-slate-100/75 px-2 py-1'
            : 'cursor-pointer rounded-lg px-2 py-1 hover:bg-slate-100/60'
          : ''
      }`}
      onClick={() => {
        if (!isSelectionMode) return;
        onToggleMessageSelection(message.id);
      }}
    >
      <div
        className={`${
          isCurrentUser
            ? 'flex max-w-xs flex-col items-end'
            : 'flex max-w-xs flex-col items-start'
        }`}
      >
        <div className={isFileMessage ? 'relative w-full' : 'relative'}>
          {isSelectionMode ? (
            <span
              className={`pointer-events-none absolute -top-1.5 ${isCurrentUser ? '-left-1.5' : '-right-1.5'} z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                isSelected
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}
            >
              {isSelected ? <TbCheck className="h-3.5 w-3.5" /> : null}
            </span>
          ) : null}
          <div
            ref={bubbleElement => {
              if (bubbleElement) {
                messageBubbleRefs.current.set(message.id, bubbleElement);
              } else {
                messageBubbleRefs.current.delete(message.id);
              }
            }}
            className={`${bubbleWrapperClass} max-w-full ${bubbleSpacingClass} ${bubbleTypographyClass} ${bubbleToneClass} ${bubbleOpacityClass} ${
              isCurrentUser
                ? 'rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                : 'rounded-tl-xl rounded-tr-xl rounded-br-xl'
            } ${
              isActiveSearchMatch
                ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
                : isSearchMatch
                  ? 'shadow-[0_0_0_1px_rgba(15,23,42,0.08)]'
                  : ''
            } cursor-pointer select-none transition-[background-color,color,opacity,box-shadow] duration-300 ease-in-out`}
            style={{
              [isCurrentUser
                ? 'borderBottomRightRadius'
                : 'borderBottomLeftRadius']: '2px',
            }}
            onClick={event => {
              if (isSelectionMode) return;
              event.stopPropagation();
              toggleMessageMenu(
                event.currentTarget,
                message.id,
                isCurrentUser ? 'left' : 'right'
              );
            }}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (isSelectionMode) {
                  onToggleMessageSelection(message.id);
                  return;
                }
                toggleMessageMenu(
                  event.currentTarget,
                  message.id,
                  isCurrentUser ? 'left' : 'right'
                );
              }
            }}
          >
            {isCurrentUser ? (
              <div className="absolute right-full bottom-0 mr-2 flex flex-col items-end text-xs text-slate-500">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {displayTime}
                </div>
                {messageDeliveryStatus || isEdited ? (
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    {isEdited ? (
                      <span className="text-slate-500">Diedit</span>
                    ) : null}
                    {messageDeliveryStatus ? (
                      <span
                        className={`inline-flex items-center ${
                          messageDeliveryStatus === 'read'
                            ? 'text-primary'
                            : 'text-slate-400'
                        }`}
                        aria-label={
                          messageDeliveryStatus === 'sending'
                            ? 'Status pesan: mengirim'
                            : messageDeliveryStatus === 'delivered'
                              ? 'Status pesan: diterima'
                              : messageDeliveryStatus === 'read'
                                ? 'Status pesan: dibaca'
                                : 'Status pesan: terkirim'
                        }
                        title={
                          messageDeliveryStatus === 'sending'
                            ? 'Mengirim'
                            : messageDeliveryStatus === 'delivered'
                              ? 'Diterima'
                              : messageDeliveryStatus === 'read'
                                ? 'Dibaca'
                                : 'Terkirim'
                        }
                      >
                        {messageDeliveryStatus === 'sending' ? (
                          <TbClock className="h-3.5 w-3.5" />
                        ) : messageDeliveryStatus === 'delivered' ? (
                          <TbChecks className="h-3.5 w-3.5" />
                        ) : messageDeliveryStatus === 'read' ? (
                          <TbChecks className="h-3.5 w-3.5" />
                        ) : (
                          <TbCheck className="h-3.5 w-3.5" />
                        )}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="absolute left-full bottom-0 ml-2 flex flex-col items-start text-xs text-slate-500">
                <div className="whitespace-nowrap">{displayTime}</div>
                {isEdited ? (
                  <div className="whitespace-nowrap text-slate-500">Diedit</div>
                ) : null}
              </div>
            )}
            {isImageMessage ? (
              <img
                src={message.message}
                alt="Chat attachment"
                className={`block max-h-72 w-auto max-w-full object-cover ${
                  hasAttachmentCaption ? 'rounded-lg' : 'rounded-[inherit]'
                }`}
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
                    <p className="text-xs text-slate-500">{pdfMetaLabel}</p>
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
                {collapsedSearchSnippet.hasLeadingEllipsis ? (
                  <span>... </span>
                ) : null}
                {highlightedMessage}
                {isMessageLong ? (
                  <>
                    {collapsedSearchSnippet.hasTrailingEllipsis ? (
                      <span>... </span>
                    ) : null}
                    <span
                      className={`font-medium ${
                        isFlashingTarget ? 'text-white/95' : 'text-primary'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={event => {
                        event.stopPropagation();
                        handleToggleExpand(message.id);
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          handleToggleExpand(message.id);
                        }
                      }}
                    >
                      Read more
                    </span>
                  </>
                ) : isExpanded ? (
                  <span
                    className={`block font-medium ${
                      isFlashingTarget ? 'text-white/95' : 'text-primary'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={event => {
                      event.stopPropagation();
                      handleToggleExpand(message.id);
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        handleToggleExpand(message.id);
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
                {highlightedCaption}
              </p>
            ) : null}
          </div>

          <PopupMenuPopover
            isOpen={isSelectionMode ? false : isMenuOpen}
            menuId={message.id}
            disableEnterAnimation={!shouldAnimateMenuOpen}
            disableExitAnimation={!shouldAnimateMenuOpen}
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
              y: menuPlacement === 'down' ? 6 : menuPlacement === 'up' ? -6 : 0,
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
      </div>
    </motion.div>
  );
};

export default MessageItem;
