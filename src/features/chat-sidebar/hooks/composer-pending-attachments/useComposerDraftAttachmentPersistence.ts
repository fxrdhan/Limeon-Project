import { useCallback, useEffect, useRef } from 'react';
import {
  loadPersistedComposerDraftAttachments,
  persistComposerDraftAttachments,
} from '../../utils/composer-draft-persistence';
import type { PendingComposerAttachment } from '../../types';
import type {
  ReleasePendingImagePreviewUrl,
  SetPendingComposerAttachments,
} from './types';

export const useComposerDraftAttachmentPersistence = ({
  currentChannelId,
  pendingComposerAttachments,
  releasePendingImagePreviewUrl,
  setPendingComposerAttachments,
  userId,
}: {
  currentChannelId: string | null;
  pendingComposerAttachments: PendingComposerAttachment[];
  releasePendingImagePreviewUrl: ReleasePendingImagePreviewUrl;
  setPendingComposerAttachments: SetPendingComposerAttachments;
  userId: string | null;
}) => {
  const pendingComposerAttachmentsMutationVersionRef = useRef(0);
  const pendingComposerAttachmentsHydrationRef = useRef<{
    channelId: string | null;
    isHydrating: boolean;
  }>({
    channelId: null,
    isHydrating: false,
  });

  const markPendingComposerAttachmentsDirty = useCallback(() => {
    pendingComposerAttachmentsMutationVersionRef.current += 1;
    pendingComposerAttachmentsHydrationRef.current = {
      channelId: currentChannelId,
      isHydrating: false,
    };
  }, [currentChannelId]);

  useEffect(() => {
    let isCancelled = false;

    pendingComposerAttachmentsMutationVersionRef.current += 1;
    const hydrationVersion =
      pendingComposerAttachmentsMutationVersionRef.current;
    pendingComposerAttachmentsHydrationRef.current = {
      channelId: currentChannelId,
      isHydrating: true,
    };

    setPendingComposerAttachments(previousAttachments => {
      previousAttachments.forEach(attachment => {
        releasePendingImagePreviewUrl(attachment.id, attachment.previewUrl);
      });
      return [];
    });

    if (!currentChannelId) {
      pendingComposerAttachmentsHydrationRef.current = {
        channelId: null,
        isHydrating: false,
      };
      return;
    }

    void (async () => {
      const persistedAttachments = await loadPersistedComposerDraftAttachments(
        currentChannelId,
        userId
      );
      if (
        isCancelled ||
        pendingComposerAttachmentsMutationVersionRef.current !==
          hydrationVersion
      ) {
        return;
      }

      pendingComposerAttachmentsMutationVersionRef.current += 1;
      pendingComposerAttachmentsHydrationRef.current = {
        channelId: currentChannelId,
        isHydrating: false,
      };
      setPendingComposerAttachments(() =>
        persistedAttachments.map(attachment => ({
          ...attachment,
          previewUrl:
            attachment.fileKind === 'image'
              ? URL.createObjectURL(attachment.file)
              : null,
        }))
      );
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    currentChannelId,
    releasePendingImagePreviewUrl,
    setPendingComposerAttachments,
    userId,
  ]);

  useEffect(() => {
    if (!currentChannelId) {
      return;
    }

    const hydrationState = pendingComposerAttachmentsHydrationRef.current;
    if (
      hydrationState.channelId === currentChannelId &&
      hydrationState.isHydrating
    ) {
      return;
    }

    void persistComposerDraftAttachments(
      currentChannelId,
      pendingComposerAttachments,
      userId
    );
  }, [currentChannelId, pendingComposerAttachments, userId]);

  return { markPendingComposerAttachmentsDirty };
};
