import EntityManagementModal from "./EntityManagementModal";
import type { ItemFormModalsProps } from "../../../types";

export default function ItemFormModals({
  categoryModal,
  typeModal,
  unitModal,
  currentSearchTerm,
}: ItemFormModalsProps) {
  return (
    <>
      <EntityManagementModal
        entityName="Kategori"
        isOpen={categoryModal.isOpen}
        onClose={categoryModal.onClose}
        onSubmit={categoryModal.onSubmit}
        isLoading={categoryModal.mutation.isPending}
        initialNameFromSearch={currentSearchTerm}
      />

      <EntityManagementModal
        isOpen={typeModal.isOpen}
        onClose={typeModal.onClose}
        onSubmit={typeModal.onSubmit}
        isLoading={typeModal.mutation.isPending}
        entityName="Jenis Item"
        initialNameFromSearch={currentSearchTerm}
      />

      <EntityManagementModal
        isOpen={unitModal.isOpen}
        onClose={unitModal.onClose}
        onSubmit={unitModal.onSubmit}
        isLoading={unitModal.mutation.isPending}
        entityName="Satuan"
        initialNameFromSearch={currentSearchTerm}
      />
    </>
  );
}