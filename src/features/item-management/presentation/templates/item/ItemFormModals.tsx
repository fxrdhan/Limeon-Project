import EntityManagementModal from '../entity/EntityManagementModal';

interface MutationState {
  isPending: boolean;
}

interface ItemFormModalsProps {
  categoryModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => Promise<void>;
    mutation: MutationState;
  };
  typeModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => Promise<void>;
    mutation: MutationState;
  };
  unitModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => Promise<void>;
    mutation: MutationState;
  };
  dosageModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => Promise<void>;
    mutation: MutationState;
  };
  currentSearchTerm?: string;
}

export default function ItemFormModals({
  categoryModal,
  typeModal,
  unitModal,
  dosageModal,
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

      <EntityManagementModal
        isOpen={dosageModal.isOpen}
        onClose={dosageModal.onClose}
        onSubmit={dosageModal.onSubmit}
        isLoading={dosageModal.mutation.isPending}
        entityName="Sediaan"
        initialNameFromSearch={currentSearchTerm}
      />
    </>
  );
}
