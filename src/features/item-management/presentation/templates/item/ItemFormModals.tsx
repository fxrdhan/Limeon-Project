import EntityModal from '../entity/EntityModal';

interface MutationState {
  isPending: boolean;
}

interface ItemFormModalsProps {
  categoryModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      code?: string;
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
      code?: string;
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
      code?: string;
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
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => Promise<void>;
    mutation: MutationState;
  };
  manufacturerModal: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
      code?: string;
      name: string;
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
  manufacturerModal,
  currentSearchTerm,
}: ItemFormModalsProps) {
  return (
    <>
      <EntityModal
        entityName="Kategori"
        isOpen={categoryModal.isOpen}
        onClose={categoryModal.onClose}
        onSubmit={categoryModal.onSubmit}
        isLoading={categoryModal.mutation.isPending}
        initialNameFromSearch={currentSearchTerm}
      />

      <EntityModal
        isOpen={typeModal.isOpen}
        onClose={typeModal.onClose}
        onSubmit={typeModal.onSubmit}
        isLoading={typeModal.mutation.isPending}
        entityName="Jenis Item"
        initialNameFromSearch={currentSearchTerm}
      />

      <EntityModal
        isOpen={unitModal.isOpen}
        onClose={unitModal.onClose}
        onSubmit={unitModal.onSubmit}
        isLoading={unitModal.mutation.isPending}
        entityName="Kemasan"
        initialNameFromSearch={currentSearchTerm}
      />

      <EntityModal
        isOpen={dosageModal.isOpen}
        onClose={dosageModal.onClose}
        onSubmit={dosageModal.onSubmit}
        isLoading={dosageModal.mutation.isPending}
        entityName="Sediaan"
        initialNameFromSearch={currentSearchTerm}
      />

      <EntityModal
        isOpen={manufacturerModal.isOpen}
        onClose={manufacturerModal.onClose}
        onSubmit={manufacturerModal.onSubmit}
        isLoading={manufacturerModal.mutation.isPending}
        entityName="Produsen"
        initialNameFromSearch={currentSearchTerm}
      />
    </>
  );
}
