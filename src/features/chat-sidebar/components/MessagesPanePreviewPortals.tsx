import toast from 'react-hot-toast';
import ImageExpandPreview from '@/components/shared/image-expand-preview';
import {
  CHAT_COPY_LOADING_TOAST_DELAY_MS,
  CHAT_SIDEBAR_TOASTER_ID,
} from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { MessagesPaneRuntime } from './messagesPaneRuntime';
import {
  openChatFileInNewTab,
  resolveCopyableChatAssetUrl,
} from '../utils/message-file';
import DocumentPreviewPortal from './DocumentPreviewPortal';
import MultiImagePreviewPortal from './MultiImagePreviewPortal';
import ProgressiveImagePreview from './ProgressiveImagePreview';

interface MessagesPanePreviewPortalsProps {
  runtime: MessagesPaneRuntime;
  activeImageGroupPreviewMessage: ChatMessage | null;
}

export const MessagesPanePreviewPortals = ({
  runtime,
  activeImageGroupPreviewMessage,
}: MessagesPanePreviewPortalsProps) => (
  <>
    <ImageExpandPreview
      isOpen={runtime.previews.isImagePreviewOpen}
      isVisible={runtime.previews.isImagePreviewVisible}
      onClose={runtime.previews.closeImagePreview}
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
          runtime.previews.closeImagePreview();
        }
      }}
    >
      <ProgressiveImagePreview
        fullSrc={runtime.previews.imagePreviewUrl}
        backdropSrc={runtime.previews.imagePreviewBackdropUrl}
        allowPointerPassthrough={true}
        alt={runtime.previews.imagePreviewName || 'Preview gambar'}
        className="h-[92vh] w-[92vw] box-border px-6 py-8"
        imageClassName="h-full w-full rounded-xl"
      />
    </ImageExpandPreview>

    <MultiImagePreviewPortal
      isOpen={runtime.previews.imageGroupPreviewItems.length > 0}
      isVisible={runtime.previews.isImageGroupPreviewVisible}
      previewItems={runtime.previews.imageGroupPreviewItems}
      activePreviewId={runtime.previews.activeImageGroupPreviewId}
      isActivePreviewForwardable={Boolean(
        activeImageGroupPreviewMessage &&
        !activeImageGroupPreviewMessage.id.startsWith('temp_')
      )}
      onSelectPreview={runtime.previews.selectImageGroupPreviewItem}
      onDownloadActivePreview={() => {
        if (!activeImageGroupPreviewMessage) {
          return;
        }

        void runtime.mutations.handleDownloadMessage(
          activeImageGroupPreviewMessage
        );
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

        void runtime.mutations.handleCopyMessage(
          activeImageGroupPreviewMessage
        );
      }}
      onForwardActivePreview={() => {
        if (
          !activeImageGroupPreviewMessage ||
          activeImageGroupPreviewMessage.id.startsWith('temp_')
        ) {
          return;
        }

        runtime.mutations.handleOpenForwardMessagePicker(
          activeImageGroupPreviewMessage
        );
      }}
      onClose={runtime.previews.closeImageGroupPreview}
      backdropClassName="z-[80] px-4 py-6"
    />

    <DocumentPreviewPortal
      isOpen={Boolean(runtime.previews.documentPreviewUrl)}
      isVisible={runtime.previews.isDocumentPreviewVisible}
      previewUrl={runtime.previews.documentPreviewUrl}
      previewName={runtime.previews.documentPreviewName}
      onClose={runtime.previews.closeDocumentPreview}
      backdropClassName="z-[80] px-4 py-6"
      iframeTitle="Preview dokumen"
    />
  </>
);
