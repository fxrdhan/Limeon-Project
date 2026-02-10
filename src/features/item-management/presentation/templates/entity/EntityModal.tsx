import React from 'react';
import { useConfirmDialog } from '@/components/dialog-box';
import { EntityModalProvider } from '../../../shared/contexts/EntityModalContext';
import { useEntityModalLogic } from '../../../application/hooks/instances/useEntityModalLogic';
import { useEntityHistory } from '../../../application/hooks/instances/useEntityHistory';
import EntityModalTemplate from '../EntityModalTemplate';
import EntityModalContent from './EntityModalContent';
import { ComparisonModal } from '../comparison';
import type { AddEditModalProps } from '@/types';

type EntityModalProps = AddEditModalProps;

const EntityModal: React.FC<EntityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onFieldAutosave,
  initialData = null,
  onDelete,
  isLoading = false,
  isDeleting = false,
  entityName,
  initialNameFromSearch,
}) => {
  useConfirmDialog();

  // Determine table name based on entity name
  const getTableName = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'kategori':
        return 'item_categories';
      case 'jenis item':
        return 'item_types';
      case 'kemasan':
        return 'item_packages';
      case 'sediaan':
        return 'item_dosages';
      case 'produsen':
        return 'item_manufacturers';
      default:
        return '';
    }
  };

  const entityTable = getTableName(entityName);
  const entityId = initialData?.id || '';

  // Pre-fetch history data for seamless UX (no loading spinner when opening history)
  const {
    history,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useEntityHistory(entityTable, entityId);

  const { contextValue, nameInputRef } = useEntityModalLogic({
    isOpen,
    onClose,
    onSubmit,
    onFieldAutosave,
    onDelete,
    initialData,
    initialNameFromSearch,
    entityName,
    isLoading,
    isDeleting,
    // Pass pre-fetched history data to context
    historyState: {
      data: history,
      isLoading: isHistoryLoading,
      error: historyError,
    },
  });

  // Extract form state for live comparison data (includes realtime updates)
  const { form } = contextValue;

  return (
    <EntityModalProvider value={contextValue}>
      <EntityModalTemplate>
        <EntityModalContent
          nameInputRef={nameInputRef}
          initialData={initialData}
        />
      </EntityModalTemplate>

      <ComparisonModal
        isOpen={contextValue.comparison.isOpen}
        isClosing={contextValue.comparison.isClosing}
        entityName={entityName}
        selectedVersion={contextValue.comparison.selectedVersion}
        currentData={{
          // Use live form state instead of stale initialData
          // This ensures comparison shows realtime updates correctly
          code: form.code || '',
          name: form.name,
          description:
            entityName === 'Produsen' ? form.address || '' : form.description,
        }}
        isDualMode={contextValue.comparison.isDualMode}
        versionA={contextValue.comparison.versionA}
        versionB={contextValue.comparison.versionB}
        isFlipped={contextValue.comparison.isFlipped}
      />
    </EntityModalProvider>
  );
};

export default EntityModal;
