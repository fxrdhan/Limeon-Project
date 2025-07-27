import React from "react";
import { useConfirmDialog } from "@/components/dialog-box";
import { EntityModalProvider } from "../../../contexts/EntityModalContext";
import { useEntityModalLogic } from "../../../hooks/useEntityModalLogic";
import EntityModalTemplate from "../../EntityModalTemplate";
import EntityModalContent from "./EntityModalContent";
import { ComparisonModal } from "../comparison";
import type { AddEditModalProps } from "@/types";

const EntityManagementModal: React.FC<AddEditModalProps> = ({
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

  return (
    <EntityModalProvider value={contextValue}>
      <EntityModalTemplate>
        <EntityModalContent nameInputRef={nameInputRef} initialData={initialData} />
      </EntityModalTemplate>
      
      <ComparisonModal
        isOpen={contextValue.comparison.isOpen}
        onClose={contextValue.uiActions.closeComparison}
        entityName={entityName}
        selectedVersion={contextValue.comparison.selectedVersion}
        currentData={{
          name: initialData?.name || '',
          description: initialData?.description || ''
        }}
      />
    </EntityModalProvider>
  );
};

export default EntityManagementModal;