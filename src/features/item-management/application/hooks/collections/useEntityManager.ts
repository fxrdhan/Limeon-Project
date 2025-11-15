import { useState, useCallback, useMemo, useEffect } from 'react';
import { useConfirmDialog } from '@/components/dialog-box';
import { useEntityCrudOperations } from './useEntityCrudOperations';
import type {
  ItemCategory,
  ItemTypeEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
  ItemUnitEntity,
} from '../../../shared/types';

// Define entity types
export type EntityType =
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units'
  | 'items';
export type EntityData =
  | ItemCategory
  | ItemTypeEntity
  | ItemPackage
  | ItemDosageEntity
  | ItemManufacturerEntity
  | ItemUnitEntity;

// Entity configuration
export interface EntityConfig {
  key: EntityType;
  label: string;
  entityName: string;
  tableName: string;
  addButtonText: string;
  searchPlaceholder: string;
  nameColumnHeader: string;
  noDataMessage: string;
  searchNoDataMessage: string;
  hasNciCode?: boolean;
  hasAddress?: boolean;
  hasAbbreviation?: boolean;
}

export const entityConfigs: Record<EntityType, EntityConfig> = {
  categories: {
    key: 'categories',
    label: 'Kategori',
    entityName: 'Kategori',
    tableName: 'item_categories',
    addButtonText: 'Tambah Kategori Baru',
    searchPlaceholder: 'Cari nama atau deskripsi kategori item',
    nameColumnHeader: 'Nama Kategori',
    noDataMessage: 'Tidak ada data kategori yang ditemukan',
    searchNoDataMessage: 'Tidak ada kategori dengan kata kunci',
  },
  types: {
    key: 'types',
    label: 'Jenis',
    entityName: 'Jenis Item',
    tableName: 'item_types',
    addButtonText: 'Tambah Jenis Item Baru',
    searchPlaceholder: 'Cari nama atau deskripsi jenis item',
    nameColumnHeader: 'Nama Jenis',
    noDataMessage: 'Tidak ada data jenis item yang ditemukan',
    searchNoDataMessage: 'Tidak ada jenis item dengan kata kunci',
  },
  packages: {
    key: 'packages',
    label: 'Kemasan',
    entityName: 'Kemasan',
    tableName: 'item_packages',
    addButtonText: 'Tambah Kemasan Baru',
    searchPlaceholder: 'Cari nama atau deskripsi kemasan',
    nameColumnHeader: 'Nama Kemasan',
    noDataMessage: 'Tidak ada data kemasan yang ditemukan',
    searchNoDataMessage: 'Tidak ada kemasan dengan kata kunci',
    hasNciCode: true,
  },
  dosages: {
    key: 'dosages',
    label: 'Sediaan',
    entityName: 'Sediaan',
    tableName: 'item_dosages',
    addButtonText: 'Tambah Sediaan Baru',
    searchPlaceholder: 'Cari nama atau deskripsi sediaan',
    nameColumnHeader: 'Nama Sediaan',
    noDataMessage: 'Tidak ada data sediaan yang ditemukan',
    searchNoDataMessage: 'Tidak ada sediaan dengan kata kunci',
    hasNciCode: true,
  },
  manufacturers: {
    key: 'manufacturers',
    label: 'Produsen',
    entityName: 'Produsen',
    tableName: 'item_manufacturers',
    addButtonText: 'Tambah Produsen Baru',
    searchPlaceholder: 'Cari nama atau alamat produsen',
    nameColumnHeader: 'Nama Produsen',
    noDataMessage: 'Tidak ada data produsen yang ditemukan',
    searchNoDataMessage: 'Tidak ada produsen dengan kata kunci',
    hasAddress: true,
  },
  units: {
    key: 'units',
    label: 'Satuan',
    entityName: 'Satuan',
    tableName: 'item_units',
    addButtonText: 'Tambah Satuan Baru',
    searchPlaceholder: 'Cari code atau nama satuan',
    nameColumnHeader: 'Nama Satuan',
    noDataMessage: 'Tidak ada data satuan yang ditemukan',
    searchNoDataMessage: 'Tidak ada satuan dengan kata kunci',
  },
  items: {
    key: 'items',
    label: 'Item',
    entityName: 'Item',
    tableName: 'items',
    addButtonText: 'Tambah Item Baru',
    searchPlaceholder: 'Cari nama, code, atau barcode item',
    nameColumnHeader: 'Nama Item',
    noDataMessage: 'Tidak ada data item yang ditemukan',
    searchNoDataMessage: 'Tidak ada item dengan kata kunci',
  },
};

// Entity manager hook options
export interface UseEntityManagerOptions {
  activeEntityType?: EntityType;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onEntityChange?: (entityType: EntityType) => void;
}

// Main entity manager hook
export const useEntityManager = (options?: UseEntityManagerOptions) => {
  const { openConfirmDialog } = useConfirmDialog();
  const {
    activeEntityType = 'categories',
    searchInputRef,
    onEntityChange,
  } = options || {};

  // State management - use getDerivedStateFromProps to reset state when activeEntityType changes
  const [entityState, setEntityState] = useState({
    activeType: activeEntityType,
    currentType: activeEntityType,
    page: 1,
    searchTerm: '',
    isAddOpen: false,
    isEditOpen: false,
    editing: null as EntityData | null,
    itemsPerPage: 20,
  });
  if (activeEntityType !== entityState.activeType) {
    setEntityState({
      activeType: activeEntityType,
      currentType: activeEntityType,
      page: 1,
      searchTerm: '',
      isAddOpen: false,
      isEditOpen: false,
      editing: null,
      itemsPerPage: entityState.itemsPerPage, // Preserve itemsPerPage
    });
  }

  // Clear search input when entity type changes (cannot access ref during render)
  useEffect(() => {
    if (
      searchInputRef?.current &&
      activeEntityType !== entityState.activeType
    ) {
      searchInputRef.current.value = '';
    }
  }, [activeEntityType, entityState.activeType, searchInputRef]);

  // Extract state values
  const currentEntityType = entityState.currentType;
  const isAddModalOpen = entityState.isAddOpen;
  const isEditModalOpen = entityState.isEditOpen;
  const editingEntity = entityState.editing;
  const search = entityState.searchTerm;
  const currentPage = entityState.page;
  const itemsPerPage = entityState.itemsPerPage;

  // Setter functions
  const setCurrentEntityType = (type: EntityType) => {
    setEntityState(prev => ({ ...prev, currentType: type }));
  };
  const setIsAddModalOpen = (open: boolean) => {
    setEntityState(prev => ({ ...prev, isAddOpen: open }));
  };
  const setIsEditModalOpen = (open: boolean) => {
    setEntityState(prev => ({ ...prev, isEditOpen: open }));
  };
  const setEditingEntity = (entity: EntityData | null) => {
    setEntityState(prev => ({ ...prev, editing: entity }));
  };
  const setSearch = (searchTerm: string) => {
    setEntityState(prev => ({ ...prev, searchTerm }));
  };
  const setCurrentPage = (page: number) => {
    setEntityState(prev => ({ ...prev, page }));
  };
  const setItemsPerPage = (items: number) => {
    setEntityState(prev => ({ ...prev, itemsPerPage: items }));
  };

  // Get current configuration
  const currentConfig = useMemo(() => {
    return entityConfigs[currentEntityType];
  }, [currentEntityType]);

  // Use simplified CRUD operations hook for API operations
  const crudOperations = useEntityCrudOperations(
    currentConfig.tableName,
    currentConfig.entityName
  );

  // Change active entity type
  const handleEntityTypeChange = useCallback(
    (entityType: EntityType) => {
      if (entityType !== currentEntityType) {
        setCurrentEntityType(entityType);
        setCurrentPage(1);
        setSearch('');
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setEditingEntity(null);

        // Clear search input
        if (searchInputRef?.current) {
          searchInputRef.current.value = '';
        }

        onEntityChange?.(entityType);
      }
    },
    [currentEntityType, searchInputRef, onEntityChange]
  );

  // Modal management
  const openAddModal = useCallback(() => {
    setEditingEntity(null);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingEntity(null);
  }, []);

  const openEditModal = useCallback((entity: EntityData) => {
    setEditingEntity(entity);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingEntity(null);
  }, []);

  // Form submit handler
  const handleSubmit = useCallback(
    async (formData: {
      id?: string;
      code?: string;
      name: string;
      description?: string;
      address?: string;
      nci_code?: string;
      abbreviation?: string;
    }) => {
      // Use simplified CRUD operations to handle the submission
      // The modal will handle its own closing animation after successful submit
      // We don't close modals here - let the modal's onClose callback handle cleanup
      await crudOperations.handleModalSubmit(formData);

      // Toast sudah ditangani oleh specific mutations (useMasterData, useDosages, useManufacturers)
      // Tidak perlu duplicate toast di sini

      // Note: Modal closing is now handled by the modal itself with animation
      // The closeAddModal/closeEditModal callbacks will be called by the modal's onClose
    },
    [crudOperations]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (entity: EntityData): Promise<void> => {
      return new Promise((resolve, reject) => {
        openConfirmDialog({
          title: 'Konfirmasi Hapus',
          message: `Apakah Anda yakin ingin menghapus ${currentConfig.entityName.toLowerCase()} "${entity.name}"?`,
          variant: 'danger',
          confirmText: 'Ya, Hapus',
          onConfirm: async () => {
            try {
              // Use simplified CRUD operations to handle the deletion
              // The modal will handle its own closing animation after successful delete
              // We don't close modals here - let the modal's onClose callback handle cleanup
              await crudOperations.deleteMutation.mutateAsync(entity.id);

              // Toast sudah ditangani oleh specific mutations (useMasterData, useDosages, useManufacturers)
              // Tidak perlu duplicate toast di sini

              // Note: Modal closing is now handled by the modal itself with animation
              // The closeEditModal callback will be called by the modal's onClose
              resolve();
            } catch (error) {
              // If delete fails, reject the promise so modal stays open
              reject(error);
            }
          },
          onCancel: () => {
            // User cancelled, reject so modal knows not to close
            reject(new Error('User cancelled'));
          },
        });
      });
    },
    [currentConfig.entityName, openConfirmDialog, crudOperations]
  );

  // Search handler
  const handleSearch = useCallback((searchValue: string) => {
    setSearch(searchValue);
    setCurrentPage(1);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  return {
    // State
    currentEntityType,
    currentConfig,
    isAddModalOpen,
    isEditModalOpen,
    editingEntity,
    search,
    currentPage,
    itemsPerPage,

    // Actions
    handleEntityTypeChange,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    handleSubmit,
    handleDelete,
    handleSearch,
    handlePageChange,
    handleItemsPerPageChange,

    // Config
    entityConfigs,
  };
};
