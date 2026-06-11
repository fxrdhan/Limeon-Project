import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PendingComposerAttachment } from '../../types';

interface UseComposerAttachmentSelectionProps {
  pendingComposerAttachments: PendingComposerAttachment[];
  closeImageActionsMenu: () => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
}

export const useComposerAttachmentSelection = ({
  pendingComposerAttachments,
  closeImageActionsMenu,
  onRemovePendingComposerAttachment,
}: UseComposerAttachmentSelectionProps) => {
  const [
    isComposerAttachmentSelectionMode,
    setIsComposerAttachmentSelectionMode,
  ] = useState(false);
  const [selectedComposerAttachmentIds, setSelectedComposerAttachmentIds] =
    useState<string[]>([]);

  const selectableComposerAttachmentIds = useMemo(
    () =>
      pendingComposerAttachments
        .filter(
          attachment =>
            attachment.fileKind === 'image' ||
            attachment.fileKind === 'document'
        )
        .map(attachment => attachment.id),
    [pendingComposerAttachments]
  );

  useEffect(() => {
    setSelectedComposerAttachmentIds(previousIds => {
      const nextIds = previousIds.filter(id =>
        selectableComposerAttachmentIds.includes(id)
      );
      const hasChanged =
        nextIds.length !== previousIds.length ||
        nextIds.some((id, index) => id !== previousIds[index]);

      return hasChanged ? nextIds : previousIds;
    });
  }, [selectableComposerAttachmentIds]);

  useEffect(() => {
    if (selectableComposerAttachmentIds.length === 0) {
      setIsComposerAttachmentSelectionMode(false);
      setSelectedComposerAttachmentIds([]);
    }
  }, [selectableComposerAttachmentIds.length]);

  const handleToggleComposerAttachmentSelection = useCallback(
    (attachmentId: string) => {
      if (!selectableComposerAttachmentIds.includes(attachmentId)) {
        return;
      }

      setIsComposerAttachmentSelectionMode(true);
      setSelectedComposerAttachmentIds(previousIds =>
        previousIds.includes(attachmentId)
          ? previousIds.filter(id => id !== attachmentId)
          : [...previousIds, attachmentId]
      );
    },
    [selectableComposerAttachmentIds]
  );

  const handleSelectAllComposerAttachments = useCallback(() => {
    setIsComposerAttachmentSelectionMode(true);
    setSelectedComposerAttachmentIds(selectableComposerAttachmentIds);
  }, [selectableComposerAttachmentIds]);

  const handleClearComposerAttachmentSelection = useCallback(() => {
    setIsComposerAttachmentSelectionMode(false);
    setSelectedComposerAttachmentIds([]);
  }, []);

  const handleDeleteSelectedComposerAttachments = useCallback(() => {
    if (selectedComposerAttachmentIds.length === 0) {
      return;
    }

    selectedComposerAttachmentIds.forEach(attachmentId => {
      onRemovePendingComposerAttachment(attachmentId);
    });
    closeImageActionsMenu();
    setSelectedComposerAttachmentIds([]);
  }, [
    closeImageActionsMenu,
    onRemovePendingComposerAttachment,
    selectedComposerAttachmentIds,
  ]);

  return {
    selectableComposerAttachmentIds,
    isComposerAttachmentSelectionMode,
    selectedComposerAttachmentIds,
    handleClearComposerAttachmentSelection,
    handleSelectAllComposerAttachments,
    handleDeleteSelectedComposerAttachments,
    handleToggleComposerAttachmentSelection,
  };
};
