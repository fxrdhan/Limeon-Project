import toast from 'react-hot-toast';
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
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MultiImagePreviewPortal from './MultiImagePreviewPortal';
import ProgressiveImagePreview from './ProgressiveImagePreview';

interface MessagesPanePreviewPortalsProps {
  runtime: MessagesPanePreviewRuntime;
  activeImageGroupPreviewMessage: ChatMessage | null;
}

export const MessagesPanePreviewPortals = ({
  runtime,
  activeImageGroupPreviewMessage,
}: MessagesPanePreviewPortalsProps) => (
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
        );
      }}
      onCopyActivePreviewLink={() => {
        if (!activeImageGroupPreviewMessage) {
          return;
        }

        void (async () => {
          const loadingToastId = 'chat-copy-image-link';
          let didShowLoadingToast = false;
          const loadingToastTimeout = window.setTimeout(() => {
            didShowLoadingToast = true;
            toast.loading('Menyiapkan link gambar...', {
              id: loadingToastId,
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }, CHAT_COPY_LOADING_TOAST_DELAY_MS);

          try {
            const copyableUrl = await resolveCopyableChatAssetUrl(
              activeImageGroupPreviewMessage.message,
              activeImageGroupPreviewMessage.file_storage_path,
              {
                allowAssetUrlFallback: false,
                messageId: activeImageGroupPreviewMessage.id,
                sharedLinkSlug: activeImageGroupPreviewMessage.shared_link_slug,
              }
            );

            if (!copyableUrl) {
              throw new Error('Link gambar tidak tersedia');
            }

            await navigator.clipboard.writeText(copyableUrl);
            window.clearTimeout(loadingToastTimeout);
            toast.success('Link gambar berhasil disalin', {
              id: didShowLoadingToast ? loadingToastId : undefined,
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          } catch (error) {
            window.clearTimeout(loadingToastTimeout);
            toast.error(
              error instanceof Error
                ? error.message
                : 'Gagal menyalin link gambar',
              {
                id: didShowLoadingToast ? loadingToastId : undefined,
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
            console.error('Failed to copy image link:', error);
          }
        })();
      }}
      onCopyActivePreviewImage={() => {
        if (!activeImageGroupPreviewMessage) {
          return;
        }

        void runtime.handleCopyMessage(activeImageGroupPreviewMessage);
      }}
      onForwardActivePreview={() => {
        if (
          !activeImageGroupPreviewMessage ||
          activeImageGroupPreviewMessage.id.startsWith('temp_')
        ) {
          return;
        }

        runtime.handleOpenForwardMessagePicker(activeImageGroupPreviewMessage);
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
