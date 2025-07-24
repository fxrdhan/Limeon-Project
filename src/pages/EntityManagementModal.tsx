import React from "react";
import { useConfirmDialog } from "@/components/dialog-box";
import { EntityModalProvider } from "@/contexts/EntityModalContext";
import { useEntityModalLogic } from "@/hooks/useEntityModalLogic";
import EntityModalTemplate from "@/components/templates/EntityModalTemplate";
import EntityModalContent from "@/components/organisms/EntityModalContent";
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
        <EntityModalContent nameInputRef={nameInputRef} />
      </EntityModalTemplate>
    </EntityModalProvider>
  );
};

export default EntityManagementModal;