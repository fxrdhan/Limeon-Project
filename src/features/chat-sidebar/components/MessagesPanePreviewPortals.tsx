import toast from 'react-hot-toast';
import { useCallback, useEffect, useRef } from 'react';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import {
  CHAT_COPY_LOADING_TOAST_DELAY_MS,
  CHAT_SIDEBAR_TOASTER_ID,
} from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { MessagesPanePreviewRuntime } from './messagesPaneRuntime';
import {
  openChatFileInNewTab,
  resolveCopyableChatAssetUrl,
} from '../utils/message-file';
import { copyTextToClipboard } from '../utils/clipboard';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MultiImagePreviewPortal from './MultiImagePreviewPortal';
import ProgressiveImagePreview from './ProgressiveImagePreview';

interface MessagesPanePreviewPortalsProps {
  runtime: MessagesPanePreviewRuntime;
  activeImageGroupPreviewMessage: ChatMessage | null;
}

const COPY_IMAGE_LINK_LOADING_TOAST_ID = 'chat-copy-image-link';

export const MessagesPanePreviewPortals = ({
  runtime,
  activeImageGroupPreviewMessage,
}: MessagesPanePreviewPortalsProps) => {
  const activeImageGroupPreviewMessageId =
    activeImageGroupPreviewMessage?.id ?? null;
  const activeImageGroupPreviewMessageIdRef = useRef<string | null>(
    activeImageGroupPreviewMessageId
  );
  const copyLinkRequestIdRef = useRef(0);
  const copyLinkLoadingToastTimeoutRef = useRef<number | null>(null);

  const clearCopyLinkLoadingToastTimeout = useCallback(() => {
    if (copyLinkLoadingToastTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(copyLinkLoadingToastTimeoutRef.current);
    copyLinkLoadingToastTimeoutRef.current = null;
  }, []);

  const isCopyLinkRequestActive = useCallback(
    (requestId: number, messageId: string) =>
      copyLinkRequestIdRef.current === requestId &&
      activeImageGroupPreviewMessageIdRef.current === messageId,
    []
  );

  const cancelPendingCopyLinkFeedback = useCallback(() => {
    copyLinkRequestIdRef.current += 1;
    clearCopyLinkLoadingToastTimeout();
    toast.dismiss(COPY_IMAGE_LINK_LOADING_TOAST_ID);
  }, [clearCopyLinkLoadingToastTimeout]);

  useEffect(() => {
    activeImageGroupPreviewMessageIdRef.current =
      activeImageGroupPreviewMessageId;
    cancelPendingCopyLinkFeedback();
  }, [activeImageGroupPreviewMessageId, cancelPendingCopyLinkFeedback]);

  useEffect(
    () => () => {
      cancelPendingCopyLinkFeedback();
    },
    [cancelPendingCopyLinkFeedback]
  );

  const handleCopyActivePreviewLink = useCallback(() => {
    if (!activeImageGroupPreviewMessage) {
      return;
    }

    void (async () => {
      const message = activeImageGroupPreviewMessage;
      const requestId = copyLinkRequestIdRef.current + 1;
      let didShowLoadingToast = false;
      copyLinkRequestIdRef.current = requestId;
      clearCopyLinkLoadingToastTimeout();

      const loadingToastTimeout = window.setTimeout(() => {
        if (!isCopyLinkRequestActive(requestId, message.id)) {
          return;
        }

        didShowLoadingToast = true;
        toast.loading('Menyiapkan link gambar...', {
          id: COPY_IMAGE_LINK_LOADING_TOAST_ID,
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      }, CHAT_COPY_LOADING_TOAST_DELAY_MS);
      copyLinkLoadingToastTimeoutRef.current = loadingToastTimeout;

      const clearCurrentLoadingToastTimeout = () => {
        window.clearTimeout(loadingToastTimeout);
        if (copyLinkLoadingToastTimeoutRef.current === loadingToastTimeout) {
          copyLinkLoadingToastTimeoutRef.current = null;
        }
      };

      try {
        const copyableUrl = await resolveCopyableChatAssetUrl(
          message.message,
          message.file_storage_path,
          {
            allowAssetUrlFallback: false,
            messageId: message.id,
            sharedLinkSlug: message.shared_link_slug,
          }
        );

        if (!isCopyLinkRequestActive(requestId, message.id)) {
          clearCurrentLoadingToastTimeout();
          if (didShowLoadingToast) {
            toast.dismiss(COPY_IMAGE_LINK_LOADING_TOAST_ID);
          }
          return;
        }

        if (!copyableUrl) {
          throw new Error('Link gambar tidak tersedia');
        }

        await copyTextToClipboard(copyableUrl);
        if (!isCopyLinkRequestActive(requestId, message.id)) {
          clearCurrentLoadingToastTimeout();
          if (didShowLoadingToast) {
            toast.dismiss(COPY_IMAGE_LINK_LOADING_TOAST_ID);
          }
          return;
        }

        clearCurrentLoadingToastTimeout();
        toast.success('Link gambar berhasil disalin', {
          id: didShowLoadingToast
            ? COPY_IMAGE_LINK_LOADING_TOAST_ID
            : undefined,
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      } catch (error) {
        clearCurrentLoadingToastTimeout();
        if (!isCopyLinkRequestActive(requestId, message.id)) {
          if (didShowLoadingToast) {
            toast.dismiss(COPY_IMAGE_LINK_LOADING_TOAST_ID);
          }
          return;
        }

        toast.error(
          error instanceof Error ? error.message : 'Gagal menyalin link gambar',
          {
            id: didShowLoadingToast
              ? COPY_IMAGE_LINK_LOADING_TOAST_ID
              : undefined,
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        console.error('Failed to copy image link:', error);
      }
    })();
  }, [
    activeImageGroupPreviewMessage,
    clearCopyLinkLoadingToastTimeout,
    isCopyLinkRequestActive,
  ]);

  return (
    <>
      <ImageExpandPreview
        isOpen={runtime.isImagePreviewOpen}
        isVisible={runtime.isImagePreviewVisible}
        onClose={runtime.closeImagePreview}
        animateScale={false}
        closeOnContentBackgroundClick={true}
        backdropClassName="z-[79] px-4 py-6"
        contentClassName="max-h-[92vh] max-w-[92vw] p-0"
        backdropRole="button"
        backdropTabIndex={0}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            runtime.closeImagePreview();
          }
        }}
      >
        <ProgressiveImagePreview
          fullSrc={runtime.imagePreviewUrl}
          backdropSrc={runtime.imagePreviewBackdropUrl}
          allowPointerPassthrough={true}
          alt={runtime.imagePreviewName || 'Preview gambar'}
          className="h-[92vh] w-[92vw] box-border px-6 py-8"
          imageClassName="h-full w-full"
        />
      </ImageExpandPreview>

      <MultiImagePreviewPortal
        isOpen={runtime.imageGroupPreviewItems.length > 0}
        isVisible={runtime.isImageGroupPreviewVisible}
        previewItems={runtime.imageGroupPreviewItems}
        activePreviewId={runtime.activeImageGroupPreviewId}
        isActivePreviewForwardable={Boolean(
          activeImageGroupPreviewMessage &&
          !activeImageGroupPreviewMessage.id.startsWith('temp_')
        )}
        onSelectPreview={runtime.selectImageGroupPreviewItem}
        onDownloadActivePreview={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void runtime.handleDownloadMessage(activeImageGroupPreviewMessage);
        }}
        onOpenActivePreviewInNewTab={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void openChatFileInNewTab(
            activeImageGroupPreviewMessage.message,
            activeImageGroupPreviewMessage.file_storage_path,
            activeImageGroupPreviewMessage.file_mime_type
          ).then(didOpenFile => {
            if (!didOpenFile) {
              toast.error('Browser memblokir tab baru', {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }
          });
        }}
        onCopyActivePreviewLink={handleCopyActivePreviewLink}
        onCopyActivePreviewImage={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          void runtime.handleCopyMessage(activeImageGroupPreviewMessage);
        }}
        onReplyActivePreview={() => {
          if (!activeImageGroupPreviewMessage) {
            return;
          }

          runtime.handleReplyMessage(activeImageGroupPreviewMessage);
        }}
        onForwardActivePreview={() => {
          if (
            !activeImageGroupPreviewMessage ||
            activeImageGroupPreviewMessage.id.startsWith('temp_')
          ) {
            return;
          }

          runtime.handleOpenForwardMessagePicker(
            activeImageGroupPreviewMessage
          );
        }}
        onClose={runtime.closeImageGroupPreview}
        backdropClassName="z-[80] px-4 py-6"
      />

      <DocumentPreviewPortal
        isOpen={Boolean(runtime.documentPreviewUrl)}
        isVisible={runtime.isDocumentPreviewVisible}
        previewUrl={runtime.documentPreviewUrl}
        previewName={runtime.documentPreviewName}
        onClose={runtime.closeDocumentPreview}
        backdropClassName="z-[80] px-4 py-6"
        iframeTitle="Preview dokumen"
      />
    </>
  );
};
