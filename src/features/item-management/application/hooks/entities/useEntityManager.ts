import { useState, useCallback, useMemo } from 'react';
import { useConfirmDialog } from '@/components/dialog-box';
import { useAlert } from '@/components/alert/hooks';
import type {
  ItemCategory,
  ItemType,
  ItemPackage,
  ItemDosage,
  ItemManufacturer,
  ItemUnit,
} from '../../../domain/entities';

// Define entity types
export type EntityType = 'categories' | 'types' | 'packages' | 'dosages' | 'manufacturers' | 'units' | 'items';
export type EntityData = ItemCategory | ItemType | ItemPackage | ItemDosage | ItemManufacturer | ItemUnit;

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
    searchPlaceholder: 'Cari nama, kode, atau barcode item',
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
  const alert = useAlert();
  const { activeEntityType = 'categories', searchInputRef, onEntityChange } = options || {};

  // State management
  const [currentEntityType, setCurrentEntityType] = useState<EntityType>(activeEntityType);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EntityData | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get current configuration
  const currentConfig = useMemo(() => {
    return entityConfigs[currentEntityType];
  }, [currentEntityType]);

  // Change active entity type
  const handleEntityTypeChange = useCallback((entityType: EntityType) => {
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
  }, [currentEntityType, searchInputRef, onEntityChange]);

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
  const handleSubmit = useCallback(async (formData: {
    id?: string;
    kode?: string;
    code?: string;
    name: string;
    description?: string;
    address?: string;
    nci_code?: string;
    abbreviation?: string;
  }) => {
    try {
      // TODO: Implement actual API calls for each entity type
      console.log('Submitting form data:', formData, 'for entity:', currentEntityType);
      
      // Close modals after successful submit
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditingEntity(null);
      
      alert.success(`${currentConfig.entityName} berhasil ${formData.id ? 'diperbarui' : 'ditambahkan'}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const action = formData.id ? 'memperbarui' : 'menambahkan';
      alert.error(`Gagal ${action} ${currentConfig.entityName}: ${errorMessage}`);
    }
  }, [currentEntityType, currentConfig.entityName, alert]);

  // Delete handler
  const handleDelete = useCallback(async (entity: EntityData) => {
    openConfirmDialog({
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus ${currentConfig.entityName.toLowerCase()} "${entity.name}"?`,
      variant: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          // TODO: Implement actual API delete call
          console.log('Deleting entity:', entity.id, 'of type:', currentEntityType);
          
          setIsEditModalOpen(false);
          setEditingEntity(null);
          
          alert.success(`${currentConfig.entityName} berhasil dihapus`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert.error(`Gagal menghapus ${currentConfig.entityName}: ${errorMessage}`);
        }
      },
    });
  }, [currentConfig.entityName, openConfirmDialog, alert, currentEntityType]);

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