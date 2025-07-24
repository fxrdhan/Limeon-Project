import AddEditModal from "@/components/add-edit/v1";

interface MutationState {
  isPending: boolean;
}

interface ItemFormModalsProps {
  categoryModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
    mutation: MutationState;
  };
  typeModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
    mutation: MutationState;
  };
  unitModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string }) => Promise<void>;
    mutation: MutationState;
  };
  currentSearchTerm?: string;
}

export default function ItemFormModals({
  categoryModal,
  typeModal,
  unitModal,
  currentSearchTerm,
}: ItemFormModalsProps) {
  return (
    <>
      <AddEditModal
        entityName="Kategori"
        isOpen={categoryModal.isOpen}
        onClose={categoryModal.onClose}
        onSubmit={categoryModal.onSubmit}
        isLoading={categoryModal.mutation.isPending}
        initialNameFromSearch={currentSearchTerm}
      />

      <AddEditModal
        isOpen={typeModal.isOpen}
        onClose={typeModal.onClose}
        onSubmit={typeModal.onSubmit}
        isLoading={typeModal.mutation.isPending}
        entityName="Jenis Item"
        initialNameFromSearch={currentSearchTerm}
      />

      <AddEditModal
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