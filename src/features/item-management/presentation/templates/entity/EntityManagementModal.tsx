import React from "react";
import { useConfirmDialog } from "@/components/dialog-box";
import { EntityModalProvider } from "../../../shared/contexts/EntityModalContext";
import { useEntityModalLogic } from "../../../application/hooks/entity/useEntityModalLogic";
import { useEntityHistory } from "../../../application/hooks/entity/useEntityHistory";
import EntityModalTemplate from "../EntityModalTemplate";
import EntityModalContent from "./EntityModalContent";
import { ComparisonModal } from "../comparison";
import type { AddEditModalProps } from "@/types";

interface EntityManagementModalProps extends AddEditModalProps {
  showKodeField?: boolean;
}

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
  showKodeField = false,
}) => {
  useConfirmDialog();
  
  // Determine table name based on entity name
  const getTableName = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'kategori':
        return 'item_categories';
      case 'jenis item':
        return 'item_types';
      case 'satuan':
        return 'item_units';
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
    showKodeField,
  });

  // Wrap restoreVersion to handle post-restore actions
  const handleRestore = async (version: number) => {
    await restoreVersion(version);
    // Refresh the page to show restored data
    window.location.reload();
  };

  return (
    <EntityModalProvider value={contextValue}>
      <EntityModalTemplate>
        <EntityModalContent nameInputRef={nameInputRef} initialData={initialData} showKodeField={showKodeField} />
      </EntityModalTemplate>
      
      <ComparisonModal
        isOpen={contextValue.comparison.isOpen}
        onClose={contextValue.uiActions.closeComparison}
        entityName={entityName}
        selectedVersion={contextValue.comparison.selectedVersion}
        currentData={{
          ...(initialData?.kode && { kode: initialData.kode }),
          name: initialData?.name || '',
          description: initialData?.description || ''
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