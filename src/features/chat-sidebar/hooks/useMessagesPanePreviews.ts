import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';
import { useMessagesPaneImagePreviews } from './useMessagesPaneImagePreviews';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  resolveDocumentPreviewResource,
  shouldPreferExternalPdfPreview,
  type PreviewableDocumentMessage,
} from '../utils/message-preview-assets';

export const useMessagesPanePreviews = ({
  currentChannelId,
  closeMessageMenu,
}: {
  currentChannelId: string | null;
  closeMessageMenu: () => void;
}) => {
  const {
    previewUrl: documentPreviewUrl,
    previewName: documentPreviewName,
    isPreviewVisible: isDocumentPreviewVisible,
    closeDocumentPreview,
    openDocumentPreview,
  } = useDocumentPreviewPortal();
  const {
    clearImagePreviewStateImmediately,
    clearImageGroupPreviewStateImmediately,
    openImageInPortal: openImageInPortalBase,
    openImageGroupInPortal: openImageGroupInPortalBase,
    ...imagePreviews
  } = useMessagesPaneImagePreviews({
    currentChannelId,
  });

  const openImageInPortal = useCallback(
    async (
      ...args: Parameters<typeof openImageInPortalBase>
    ): Promise<void> => {
      closeMessageMenu();
      await openImageInPortalBase(...args);
    },
    [closeMessageMenu, openImageInPortalBase]
  );

  const openImageGroupInPortal = useCallback(
    async (
      ...args: Parameters<typeof openImageGroupInPortalBase>
    ): Promise<void> => {
      closeMessageMenu();
      await openImageGroupInPortalBase(...args);
    },
    [closeMessageMenu, openImageGroupInPortalBase]
  );

  const openDocumentInPortal = useCallback(
    async (
      message: PreviewableDocumentMessage,
      previewName: string,
      forcePdfMime = false
    ) => {
      closeMessageMenu();
      clearImagePreviewStateImmediately();
      clearImageGroupPreviewStateImmediately();

      const shouldOpenExternally =
        forcePdfMime && shouldPreferExternalPdfPreview();
      const externalPreviewWindow = shouldOpenExternally
        ? window.open('', '_blank')
        : null;

      if (externalPreviewWindow) {
        try {
          externalPreviewWindow.opener = null;
        } catch {
          // Ignore cross-browser opener assignment failures.
        }
      }

      try {
        if (shouldOpenExternally && externalPreviewWindow) {
          const resolvedPreviewResource = await resolveDocumentPreviewResource({
            forcePdfMime,
            message,
          });

          if (!resolvedPreviewResource.previewUrl) {
            throw new Error('Document preview is unavailable');
          }

          externalPreviewWindow.location.replace(
            resolvedPreviewResource.previewUrl
          );
          return;
        }

        await openDocumentPreview({
          previewName,
          resolvePreviewUrl: async () => {
            const resolvedPreviewResource =
              await resolveDocumentPreviewResource({
                forcePdfMime,
                message,
              });

            if (!resolvedPreviewResource.previewUrl) {
              throw new Error('Document preview is unavailable');
            }

            return {
              previewUrl: resolvedPreviewResource.previewUrl,
              revokeOnClose: resolvedPreviewResource.revokeOnClose,
            };
          },
        });
      } catch {
        externalPreviewWindow?.close();
        toast.error('Preview dokumen tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      }
    },
    [
      closeMessageMenu,
      clearImageGroupPreviewStateImmediately,
      clearImagePreviewStateImmediately,
      openDocumentPreview,
    ]
  );

  return {
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
    ...imagePreviews,
    openImageInPortal,
    openImageGroupInPortal,
    openDocumentInPortal,
  };
};
