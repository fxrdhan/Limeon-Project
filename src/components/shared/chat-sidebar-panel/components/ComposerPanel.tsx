import { AnimatePresence, motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
import PopupMenuPopover from '@/components/shared/popup-menu-popover';
import {
  TbArrowUp,
  TbDotsVertical,
  TbEye,
  TbFileDescription,
  TbFileIsr,
  TbFileShredder,
  TbFileTypeJpg,
  TbFileTypePng,
  TbMusic,
  TbPencil,
  TbPhotoEdit,
  TbPhotoMinus,
  TbPhoto,
  TbPlus,
  TbX,
} from 'react-icons/tb';
import ImageUploader from '@/components/image-manager';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import type { PendingComposerAttachment } from '../types';

const resolveAttachmentExtension = (attachment: PendingComposerAttachment) => {
  const extensionFromName = attachment.fileName
    .split(/[?#]/)[0]
    .split('.')
    .pop()
    ?.trim()
    .toLowerCase();
  if (extensionFromName) return extensionFromName;

  const mimeSubtype = attachment.mimeType
    .split('/')[1]
    ?.split('+')[0]
    ?.trim()
    .toLowerCase();
  if (!mimeSubtype) return '';
  if (mimeSubtype === 'jpeg') return 'jpg';
  return mimeSubtype;
};

interface ComposerPanelProps {
  message: string;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerAttachments: PendingComposerAttachment[];
  previewComposerImageAttachment: PendingComposerAttachment | undefined;
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  composerContainerRef: RefObject<HTMLDivElement | null>;
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  composerSyncLayoutTransition: {
    type: 'tween';
    ease: readonly [number, number, number, number];
    duration: number;
  };
  composerBaseBorderColor: string;
  composerBaseShadow: string;
  composerGlowShadowPeak: string;
  composerGlowShadowHigh: string;
  composerGlowShadowMid: string;
  composerGlowShadowFade: string;
  composerGlowShadowLow: string;
  sendSuccessGlowDuration: number;
  onMessageChange: (nextMessage: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onAttachButtonClick: () => void;
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onAttachAudioClick: () => void;
  onImageFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDocumentFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelEditMessage: () => void;
  onFocusEditingTargetMessage: () => void;
  onOpenComposerImagePreview: (attachmentId: string) => void;
  onCloseComposerImagePreview: () => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onQueueComposerImage: (file: File, replaceAttachmentId?: string) => void;
}

const ComposerPanel = ({
  message,
  editingMessagePreview,
  messageInputHeight,
  isMessageInputMultiline,
  isSendSuccessGlowVisible,
  isAttachModalOpen,
  pendingComposerAttachments,
  previewComposerImageAttachment,
  isComposerImageExpanded,
  isComposerImageExpandedVisible,
  messageInputRef,
  composerContainerRef,
  attachButtonRef,
  attachModalRef,
  imageInputRef,
  documentInputRef,
  audioInputRef,
  composerSyncLayoutTransition,
  composerBaseBorderColor,
  composerBaseShadow,
  composerGlowShadowPeak,
  composerGlowShadowHigh,
  composerGlowShadowMid,
  composerGlowShadowFade,
  composerGlowShadowLow,
  sendSuccessGlowDuration,
  onMessageChange,
  onKeyDown,
  onPaste,
  onSendMessage,
  onAttachButtonClick,
  onAttachImageClick,
  onAttachDocumentClick,
  onAttachAudioClick,
  onImageFileChange,
  onDocumentFileChange,
  onAudioFileChange,
  onCancelEditMessage,
  onFocusEditingTargetMessage,
  onOpenComposerImagePreview,
  onCloseComposerImagePreview,
  onRemovePendingComposerAttachment,
  onQueueComposerImage,
}: ComposerPanelProps) => {
  const [openImageActionsAttachmentId, setOpenImageActionsAttachmentId] =
    useState<string | null>(null);
  const [imageActionsMenuPosition, setImageActionsMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [composerDocumentPreviewUrl, setComposerDocumentPreviewUrl] = useState<
    string | null
  >(null);
  const [composerDocumentPreviewName, setComposerDocumentPreviewName] =
    useState('');
  const [
    isComposerDocumentPreviewVisible,
    setIsComposerDocumentPreviewVisible,
  ] = useState(false);
  const imageActionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const composerDocumentPreviewCloseTimerRef = useRef<number | null>(null);
  const composerDocumentPreviewObjectUrlRef = useRef<string | null>(null);
  const IMAGE_ACTIONS_MENU_SIDE_GAP = 6;
  const IMAGE_ACTIONS_MENU_VIEWPORT_PADDING = 8;
  const IMAGE_ACTIONS_MENU_FALLBACK_WIDTH = 148;
  const IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT = 92;

  const getImageActionsMenuPosition = useCallback(
    (targetButton: HTMLButtonElement) => {
      const triggerRect = targetButton.getBoundingClientRect();
      const renderedMenuRect =
        imageActionsMenuRef.current?.getBoundingClientRect();
      const menuWidth = Math.ceil(
        renderedMenuRect?.width ?? IMAGE_ACTIONS_MENU_FALLBACK_WIDTH
      );
      const menuHeight = Math.ceil(
        renderedMenuRect?.height ?? IMAGE_ACTIONS_MENU_FALLBACK_HEIGHT
      );
      const maxLeft = Math.max(
        IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
        window.innerWidth - menuWidth - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
      );
      const preferredLeft =
        triggerRect.left - menuWidth - IMAGE_ACTIONS_MENU_SIDE_GAP;
      const left = Math.min(
        Math.max(preferredLeft, IMAGE_ACTIONS_MENU_VIEWPORT_PADDING),
        maxLeft
      );
      const preferredTop =
        triggerRect.top + triggerRect.height / 2 - menuHeight / 2;
      const maxTop = Math.max(
        IMAGE_ACTIONS_MENU_VIEWPORT_PADDING,
        window.innerHeight - menuHeight - IMAGE_ACTIONS_MENU_VIEWPORT_PADDING
      );
      const top = Math.min(
        Math.max(preferredTop, IMAGE_ACTIONS_MENU_VIEWPORT_PADDING),
        maxTop
      );

      return { top, left };
    },
    []
  );

  const closeImageActionsMenu = useCallback(() => {
    setOpenImageActionsAttachmentId(null);
    setImageActionsMenuPosition(null);
  }, []);
  const releaseComposerDocumentPreviewObjectUrl = useCallback(() => {
    if (!composerDocumentPreviewObjectUrlRef.current) return;
    URL.revokeObjectURL(composerDocumentPreviewObjectUrlRef.current);
    composerDocumentPreviewObjectUrlRef.current = null;
  }, []);
  const closeComposerDocumentPreview = useCallback(() => {
    setIsComposerDocumentPreviewVisible(false);
    if (composerDocumentPreviewCloseTimerRef.current) {
      window.clearTimeout(composerDocumentPreviewCloseTimerRef.current);
      composerDocumentPreviewCloseTimerRef.current = null;
    }
    composerDocumentPreviewCloseTimerRef.current = window.setTimeout(() => {
      setComposerDocumentPreviewUrl(null);
      setComposerDocumentPreviewName('');
      releaseComposerDocumentPreviewObjectUrl();
      composerDocumentPreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseComposerDocumentPreviewObjectUrl]);
  const openDocumentAttachmentInPortal = useCallback(
    (attachment: PendingComposerAttachment) => {
      if (composerDocumentPreviewCloseTimerRef.current) {
        window.clearTimeout(composerDocumentPreviewCloseTimerRef.current);
        composerDocumentPreviewCloseTimerRef.current = null;
      }
      releaseComposerDocumentPreviewObjectUrl();

      const isPdfAttachment =
        resolveAttachmentExtension(attachment) === 'pdf' ||
        attachment.mimeType.toLowerCase().includes('pdf');
      if (!isPdfAttachment) {
        const nonPdfUrl = URL.createObjectURL(attachment.file);
        const openedTab = window.open(
          nonPdfUrl,
          '_blank',
          'noopener,noreferrer'
        );
        if (!openedTab) {
          URL.revokeObjectURL(nonPdfUrl);
          return;
        }
        window.setTimeout(() => {
          URL.revokeObjectURL(nonPdfUrl);
        }, 60_000);
        return;
      }
      const openTarget =
        isPdfAttachment && attachment.file.type !== 'application/pdf'
          ? new Blob([attachment.file], { type: 'application/pdf' })
          : attachment.file;
      const attachmentUrl = URL.createObjectURL(openTarget);
      composerDocumentPreviewObjectUrlRef.current = attachmentUrl;
      setComposerDocumentPreviewUrl(attachmentUrl);
      setComposerDocumentPreviewName(attachment.fileName || 'Dokumen');
      requestAnimationFrame(() => {
        setIsComposerDocumentPreviewVisible(true);
      });
    },
    [releaseComposerDocumentPreviewObjectUrl]
  );
  const openImageActionsAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === openImageActionsAttachmentId &&
      (attachment.fileKind === 'image' || attachment.fileKind === 'document')
  );
  const imageActions: PopupMenuAction[] = openImageActionsAttachment
    ? openImageActionsAttachment.fileKind === 'image'
      ? [
          {
            label: 'Buka',
            icon: <TbEye className="h-4.5 w-4.5" />,
            onClick: () => {
              closeImageActionsMenu();
              onOpenComposerImagePreview(openImageActionsAttachment.id);
            },
          },
          {
            label: 'Ganti',
            icon: <TbPhotoEdit className="-ml-px h-4.5 w-4.5" />,
            onClick: () => {
              closeImageActionsMenu();
              onAttachImageClick(openImageActionsAttachment.id);
            },
          },
          {
            label: 'Hapus',
            icon: <TbPhotoMinus className="h-4 w-4" />,
            tone: 'danger',
            onClick: () => {
              closeImageActionsMenu();
              onRemovePendingComposerAttachment(openImageActionsAttachment.id);
            },
          },
        ]
      : [
          {
            label: 'Buka',
            icon: <TbEye className="h-4.5 w-4.5" />,
            onClick: () => {
              closeImageActionsMenu();
              openDocumentAttachmentInPortal(openImageActionsAttachment);
            },
          },
          {
            label: 'Ganti',
            icon: <TbFileIsr className="h-4.5 w-4.5" />,
            onClick: () => {
              closeImageActionsMenu();
              onAttachDocumentClick(openImageActionsAttachment.id);
            },
          },
          {
            label: 'Hapus',
            icon: <TbFileShredder className="h-4 w-4" />,
            tone: 'danger',
            onClick: () => {
              closeImageActionsMenu();
              onRemovePendingComposerAttachment(openImageActionsAttachment.id);
            },
          },
        ]
    : [];

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;
    const isOpenTargetStillPresent = pendingComposerAttachments.some(
      attachment =>
        attachment.id === openImageActionsAttachmentId &&
        (attachment.fileKind === 'image' || attachment.fileKind === 'document')
    );
    if (!isOpenTargetStillPresent) {
      setOpenImageActionsAttachmentId(null);
    }
  }, [openImageActionsAttachmentId, pendingComposerAttachments]);

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (imageActionsMenuRef.current?.contains(target)) return;
      if (imageActionsButtonRef.current?.contains(target)) return;
      closeImageActionsMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImageActionsMenu();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeImageActionsMenu, openImageActionsAttachmentId]);

  useEffect(() => {
    if (!openImageActionsAttachmentId) return;

    const syncMenuPosition = () => {
      const targetButton = imageActionsButtonRef.current;
      if (!targetButton) {
        closeImageActionsMenu();
        return;
      }

      setImageActionsMenuPosition(getImageActionsMenuPosition(targetButton));
    };

    syncMenuPosition();
    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);

    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
    };
  }, [
    closeImageActionsMenu,
    getImageActionsMenuPosition,
    openImageActionsAttachmentId,
  ]);

  useEffect(() => {
    return () => {
      if (composerDocumentPreviewCloseTimerRef.current) {
        window.clearTimeout(composerDocumentPreviewCloseTimerRef.current);
        composerDocumentPreviewCloseTimerRef.current = null;
      }
      releaseComposerDocumentPreviewObjectUrl();
    };
  }, [releaseComposerDocumentPreviewObjectUrl]);

  const contextualPanelTransition = {
    duration: composerSyncLayoutTransition.duration,
    ease: composerSyncLayoutTransition.ease,
    layout: composerSyncLayoutTransition,
  } as const;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-12"
        style={{
          background:
            'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.72) 46%, rgba(255,255,255,0) 100%)',
        }}
      />

      <div
        ref={composerContainerRef}
        className="absolute bottom-2 left-0 right-0 px-3 pb-4"
      >
        <motion.div
          layout
          initial={false}
          animate={
            isSendSuccessGlowVisible
              ? {
                  borderColor: [
                    composerBaseBorderColor,
                    'oklch(50.8% 0.118 165.612 / 0.55)',
                    'oklch(50.8% 0.118 165.612 / 0.48)',
                    'oklch(50.8% 0.118 165.612 / 0.42)',
                    'oklch(50.8% 0.118 165.612 / 0.32)',
                    'oklch(50.8% 0.118 165.612 / 0.22)',
                    composerBaseBorderColor,
                  ],
                  boxShadow: [
                    composerBaseShadow,
                    composerGlowShadowPeak,
                    composerGlowShadowHigh,
                    composerGlowShadowMid,
                    composerGlowShadowFade,
                    composerGlowShadowLow,
                    composerBaseShadow,
                  ],
                }
              : {
                  borderColor: composerBaseBorderColor,
                  boxShadow: composerBaseShadow,
                }
          }
          transition={
            isSendSuccessGlowVisible
              ? {
                  layout: composerSyncLayoutTransition,
                  duration: sendSuccessGlowDuration / 1000,
                  times: [0, 0.12, 0.3, 0.48, 0.66, 0.82, 1],
                  ease: 'easeOut',
                }
              : {
                  layout: composerSyncLayoutTransition,
                  duration: 0.12,
                  ease: 'easeOut',
                }
          }
          className="relative z-10 rounded-2xl border bg-white"
        >
          <motion.div
            layout
            transition={{ layout: composerSyncLayoutTransition }}
            className="relative z-10 rounded-[15px] bg-white px-2.5 py-2.5 transition-[height,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {editingMessagePreview ? (
                <motion.div
                  layout
                  key="editing-preview-inline"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={contextualPanelTransition}
                  className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-slate-700 transition-colors hover:border-primary/30 hover:bg-slate-100"
                  role="button"
                  tabIndex={0}
                  aria-label="Lihat pesan yang sedang diedit"
                  title="Klik untuk lihat pesan asal"
                  onClick={onFocusEditingTargetMessage}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onFocusEditingTargetMessage();
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-label="Cancel editing message"
                    onClick={event => {
                      event.stopPropagation();
                      onCancelEditMessage();
                    }}
                    className="group inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  >
                    <TbPencil className="h-4 w-4 group-hover:hidden" />
                    <TbX className="hidden h-4 w-4 group-hover:block" />
                  </button>
                  <p className="min-w-0 flex-1 truncate text-left text-sm leading-5 text-slate-700">
                    {editingMessagePreview}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false} mode="popLayout">
              {pendingComposerAttachments.length > 0 ? (
                <motion.div
                  layout
                  key="composer-attachments-preview"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={contextualPanelTransition}
                  className="mb-2"
                >
                  <div className="mb-1 px-0.5 text-[11px] text-slate-500">
                    Lampiran {pendingComposerAttachments.length}/5
                  </div>
                  <div className="flex flex-col gap-2 pr-1">
                    {pendingComposerAttachments.map(attachment => {
                      const isImageAttachment = attachment.fileKind === 'image';
                      const isAudioAttachment = attachment.fileKind === 'audio';
                      const isDocumentAttachment =
                        attachment.fileKind === 'document';
                      const attachmentExtension =
                        resolveAttachmentExtension(attachment);
                      const isJpgDocumentAttachment =
                        attachmentExtension === 'jpg' ||
                        attachmentExtension === 'jpeg';
                      const isPngDocumentAttachment =
                        attachmentExtension === 'png';
                      const isMenuOpen =
                        openImageActionsAttachmentId === attachment.id;

                      return (
                        <div
                          key={attachment.id}
                          className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
                        >
                          {isImageAttachment ? (
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg text-left transition-colors hover:bg-slate-100/90"
                              onClick={() => {
                                onOpenComposerImagePreview(attachment.id);
                              }}
                              onKeyDown={event => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault();
                                  onOpenComposerImagePreview(attachment.id);
                                }
                              }}
                            >
                              <img
                                src={attachment.previewUrl ?? ''}
                                alt={attachment.fileName}
                                className="h-11 w-11 rounded-lg object-cover"
                                draggable={false}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {attachment.fileName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {attachment.fileTypeLabel}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg">
                              {isAudioAttachment ? (
                                <TbMusic className="h-5 w-5 shrink-0 text-slate-600" />
                              ) : attachment.pdfCoverUrl ? (
                                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
                                  <img
                                    src={attachment.pdfCoverUrl}
                                    alt="PDF cover preview"
                                    className="h-full w-full object-cover"
                                    draggable={false}
                                  />
                                </div>
                              ) : isJpgDocumentAttachment ? (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                                  <TbFileTypeJpg className="h-5 w-5 text-slate-600" />
                                </div>
                              ) : isPngDocumentAttachment ? (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                                  <TbFileTypePng className="h-5 w-5 text-slate-600" />
                                </div>
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[11px] font-semibold tracking-wide text-slate-700">
                                  {(
                                    attachment.fileName
                                      .split('.')
                                      .pop()
                                      ?.toUpperCase() ||
                                    attachment.fileTypeLabel
                                  ).slice(0, 4)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {attachment.fileName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {attachment.fileTypeLabel}
                                </p>
                              </div>
                            </div>
                          )}

                          {isImageAttachment || isDocumentAttachment ? (
                            <div className="relative shrink-0">
                              <button
                                ref={
                                  isMenuOpen ? imageActionsButtonRef : undefined
                                }
                                type="button"
                                aria-label={
                                  isImageAttachment
                                    ? 'Aksi gambar'
                                    : 'Aksi dokumen'
                                }
                                title={
                                  isImageAttachment
                                    ? 'Aksi gambar'
                                    : 'Aksi dokumen'
                                }
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                onClick={event => {
                                  event.stopPropagation();
                                  if (
                                    openImageActionsAttachmentId ===
                                    attachment.id
                                  ) {
                                    closeImageActionsMenu();
                                    return;
                                  }

                                  setOpenImageActionsAttachmentId(
                                    attachment.id
                                  );
                                  setImageActionsMenuPosition(
                                    getImageActionsMenuPosition(
                                      event.currentTarget
                                    )
                                  );
                                }}
                                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                              >
                                <TbDotsVertical className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={
                                isAudioAttachment
                                  ? 'Hapus audio'
                                  : 'Hapus dokumen'
                              }
                              onClick={() => {
                                onRemovePendingComposerAttachment(
                                  attachment.id
                                );
                              }}
                              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                            >
                              <TbX className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {typeof document !== 'undefined' &&
            openImageActionsAttachmentId &&
            imageActionsMenuPosition
              ? createPortal(
                  <PopupMenuPopover
                    isOpen
                    className="fixed z-[120] origin-top-right"
                    style={{
                      top: imageActionsMenuPosition.top,
                      left: imageActionsMenuPosition.left,
                    }}
                  >
                    <div
                      ref={imageActionsMenuRef}
                      onClick={event => event.stopPropagation()}
                    >
                      <PopupMenuContent
                        actions={imageActions}
                        minWidthClassName="min-w-[132px]"
                      />
                    </div>
                  </PopupMenuPopover>,
                  document.body
                )
              : null}

            <motion.div
              layout
              transition={{ layout: composerSyncLayoutTransition }}
              className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
                isMessageInputMultiline
                  ? 'grid-rows-[auto_auto] gap-y-1 items-end'
                  : 'grid-rows-[auto] gap-y-0 items-center'
              }`}
            >
              <motion.textarea
                layout="position"
                transition={{ layout: composerSyncLayoutTransition }}
                ref={messageInputRef}
                value={message}
                onChange={e => onMessageChange(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                placeholder="Type a message..."
                rows={1}
                style={{ height: `${messageInputHeight}px` }}
                className={`w-full resize-none bg-transparent border-0 p-0 text-[15px] leading-[22px] text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isMessageInputMultiline
                    ? 'col-span-3 row-start-1 self-start'
                    : 'col-start-2 row-start-1 self-center'
                }`}
              />
              <motion.button
                layout="position"
                transition={{ layout: composerSyncLayoutTransition }}
                type="button"
                ref={attachButtonRef}
                onClick={onAttachButtonClick}
                aria-label="Attach file"
                aria-expanded={isAttachModalOpen}
                aria-haspopup="dialog"
                className={`h-8 w-8 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center justify-self-start shrink-0 cursor-pointer ${
                  isMessageInputMultiline
                    ? 'col-start-1 row-start-2'
                    : 'col-start-1 row-start-1'
                }`}
              >
                <motion.span
                  animate={{ rotate: isAttachModalOpen ? 45 : 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <TbPlus size={20} />
                </motion.span>
              </motion.button>
              <motion.button
                layout="position"
                transition={{ layout: composerSyncLayoutTransition }}
                onClick={onSendMessage}
                className={`h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center justify-self-end cursor-pointer whitespace-nowrap shrink-0 ${
                  isMessageInputMultiline
                    ? 'col-start-3 row-start-2'
                    : 'col-start-3 row-start-1'
                }`}
              >
                <TbArrowUp size={20} className="text-white" />
              </motion.button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImageFileChange}
              />
              <input
                ref={documentInputRef}
                type="file"
                accept="*/*"
                multiple
                className="hidden"
                onChange={onDocumentFileChange}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={onAudioFileChange}
              />
            </motion.div>

            <AnimatePresence>
              {isAttachModalOpen ? (
                <motion.div
                  ref={attachModalRef}
                  role="dialog"
                  aria-label="Attach file"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute bottom-[calc(100%+10px)] left-0 z-20 inline-flex w-max flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
                >
                  <button
                    type="button"
                    onClick={() => onAttachImageClick()}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbPhoto className="h-4 w-4 text-slate-500" />
                    <span>Gambar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAttachDocumentClick()}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg pl-1.5 pr-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbFileDescription className="h-4 w-4 text-slate-500" />
                    <span>Dokumen</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAttachAudioClick}
                    className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <TbMusic className="h-4 w-4 text-slate-500" />
                    <span>Audio</span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      <ImageExpandPreview
        isOpen={Boolean(
          previewComposerImageAttachment && isComposerImageExpanded
        )}
        isVisible={isComposerImageExpandedVisible}
        onClose={onCloseComposerImagePreview}
        backdropClassName="z-[70] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCloseComposerImagePreview();
          }
        }}
      >
        {previewComposerImageAttachment ? (
          <ImageUploader
            id="chat-composer-image-preview"
            shape="rounded"
            hasImage={true}
            onPopupClose={onCloseComposerImagePreview}
            className="max-h-[92vh] max-w-[92vw]"
            popupTrigger="click"
            onImageUpload={async file => {
              onCloseComposerImagePreview();
              onQueueComposerImage(file, previewComposerImageAttachment.id);
            }}
            onImageDelete={async () => {
              onRemovePendingComposerAttachment(
                previewComposerImageAttachment.id
              );
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={previewComposerImageAttachment.previewUrl ?? ''}
              alt={previewComposerImageAttachment.fileName}
              className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
              draggable={false}
            />
          </ImageUploader>
        ) : null}
      </ImageExpandPreview>

      <DocumentPreviewPortal
        isOpen={Boolean(composerDocumentPreviewUrl)}
        isVisible={isComposerDocumentPreviewVisible}
        previewUrl={composerDocumentPreviewUrl}
        previewName={composerDocumentPreviewName}
        onClose={closeComposerDocumentPreview}
        backdropClassName="z-[72] px-4 py-6"
        iframeTitle="Preview dokumen composer"
      />
    </>
  );
};

export default ComposerPanel;
