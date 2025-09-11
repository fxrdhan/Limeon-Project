import React from 'react';
import { useConfirmDialog } from '@/components/dialog-box';
import { EntityModalProvider } from '../../../shared/contexts/EntityModalContext';
import { useEntityModalLogic } from '../../../application/hooks/instances/useEntityModalLogic';
import { useEntityHistory } from '../../../application/hooks/instances/useEntityHistory';
import EntityModalTemplate from '../EntityModalTemplate';
import EntityModalContent from './EntityModalContent';
import { ComparisonModal } from '../comparison';
import type { AddEditModalProps } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

type EntityManagementModalProps = AddEditModalProps;

const EntityManagementModal: React.FC<EntityManagementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  onDelete,
  isLoading = false,
  isDeleting = false,
  entityName,
  initialNameFromSearch,
}) => {
  useConfirmDialog();
  const queryClient = useQueryClient();

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

  // Get restore function from useEntityHistory hook
  const { restoreVersion } = useEntityHistory(entityTable, entityId);

  const { contextValue, nameInputRef } = useEntityModalLogic({
    isOpen,
    onClose,
    onSubmit,
    onDelete,
    initialData,
    initialNameFromSearch,
    entityName,
    isLoading,
    isDeleting,
  });

  // Wrap restoreVersion to handle post-restore actions
  const handleRestore = async (version: number) => {
    await restoreVersion(version);
    // Invalidate cached queries and close comparison modal instead of full reload
    try {
      await queryClient.invalidateQueries();
    } catch (e) {
      // Non-fatal: failing to invalidate queries should not break the flow

      console.error('Failed to invalidate queries after restore', e);
    }
    try {
      contextValue.uiActions.closeComparison();
    } catch (e) {
      // Non-fatal: UI close best-effort
      console.error('Failed to close comparison modal after restore', e);
    }
  };

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
        onClose={contextValue.uiActions.closeComparison}
        entityName={entityName}
        selectedVersion={contextValue.comparison.selectedVersion}
        currentData={{
          ...(initialData?.code && { code: initialData.code }),
          name: initialData?.name || '',
          description:
            entityName === 'Produsen'
              ? (initialData as { address?: string })?.address || ''
              : initialData?.description || '',
        }}
        isDualMode={contextValue.comparison.isDualMode}
        versionA={contextValue.comparison.versionA}
        versionB={contextValue.comparison.versionB}
        onFlipVersions={contextValue.uiActions.flipVersions}
        onRestore={initialData?.id ? handleRestore : undefined}
      />
    </EntityModalProvider>
  );
};

export default EntityManagementModal;
