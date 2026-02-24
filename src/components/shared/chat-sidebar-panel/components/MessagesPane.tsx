import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from 'react';
import {
  TbCircleArrowDownFilled,
  TbCopy,
  TbDownload,
  TbFileDescription,
  TbMusic,
  TbPencil,
  TbTrash,
} from 'react-icons/tb';
import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import type { ChatMessage } from '@/services/api/chat.service';
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
  lastPreselectedMenuActionIndex: number | null;
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
  setLastPreselectedMenuActionIndex: Dispatch<SetStateAction<number | null>>;
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
  lastPreselectedMenuActionIndex,
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
  setLastPreselectedMenuActionIndex,
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
  return (
    <>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-x-hidden px-3 pt-3 overflow-y-auto space-y-3 transition-[padding-bottom] duration-[110ms] ease-out"
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
              const isCurrentUser = msg.sender_id === user?.id;
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
              const fileTypeLabel = isFileMessage
                ? (() => {
                    const rawSource = fileName || msg.message || '';
                    const sourceWithoutQuery = rawSource.split(/[?#]/)[0];
                    const extension = sourceWithoutQuery
                      .split('.')
                      .pop()
                      ?.trim()
                      .toUpperCase();

                    if (extension && extension.length <= 10) {
                      return extension;
                    }

                    const mimeSubtype = msg.file_mime_type
                      ?.split('/')[1]
                      ?.split('+')[0]
                      ?.trim()
                      .toUpperCase();
                    if (mimeSubtype) {
                      return mimeSubtype;
                    }

                    return fileKind === 'audio' ? 'AUDIO' : 'FILE';
                  })()
                : null;
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

              if (isFileMessage) {
                menuActions.unshift({
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
              const hasValidLastPreselectedMenuActionIndex =
                Number.isInteger(lastPreselectedMenuActionIndex) &&
                lastPreselectedMenuActionIndex !== null &&
                lastPreselectedMenuActionIndex >= 0 &&
                lastPreselectedMenuActionIndex < menuActions.length &&
                !menuActions[lastPreselectedMenuActionIndex]?.disabled;
              const initialPreselectedMenuActionIndex =
                hasValidLastPreselectedMenuActionIndex
                  ? lastPreselectedMenuActionIndex
                  : undefined;
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
                        className={`${isFileMessage ? 'block w-full' : 'inline-block'} max-w-full px-3 py-2 text-sm whitespace-pre-wrap break-words ${bubbleToneClass} ${bubbleOpacityClass} ${
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
                        ) : isFileMessage ? (
                          <div className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-lg bg-white/65 px-2 py-2 text-slate-800">
                            {isAudioFileMessage ? (
                              <TbMusic className="h-5 w-5 shrink-0 text-slate-600" />
                            ) : (
                              <TbFileDescription className="h-5 w-5 shrink-0 text-slate-600" />
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="block w-full truncate text-sm font-medium text-slate-800">
                                {fileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {fileTypeLabel}
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
                          initialPreselectedIndex={
                            initialPreselectedMenuActionIndex
                          }
                          onPreselectedIndexChange={index => {
                            setLastPreselectedMenuActionIndex(prev =>
                              prev === index ? prev : index
                            );
                          }}
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
    </>
  );
};

export default MessagesPane;
