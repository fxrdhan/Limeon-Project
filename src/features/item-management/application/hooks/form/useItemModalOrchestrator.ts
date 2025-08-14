import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type {
  ItemCategory,
  ItemTypeEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
  ItemUnitEntity,
} from '../../../shared/types';
import type { ItemFormData } from '../../../shared/types';

interface EntitySaveData {
  code?: string;
  name: string;
  description?: string;
  address?: string;
}

interface EntitySaveResult {
  newCategory?: ItemCategory;
  updatedCategories?: ItemCategory[];
  newType?: ItemTypeEntity;
  updatedTypes?: ItemTypeEntity[];
  newUnit?: ItemPackage;
  updatedPackages?: ItemPackage[];
  newDosage?: ItemDosageEntity;
  updatedDosages?: ItemDosageEntity[];
  newManufacturer?: ItemManufacturerEntity;
  updatedManufacturers?: ItemManufacturerEntity[];
}

interface UseItemModalOrchestratorProps {
  formState: {
    setCurrentSearchTermForModal: (searchTerm?: string) => void;
    setIsAddEditModalOpen: (isOpen: boolean) => void;
    setIsAddTypeModalOpen: (isOpen: boolean) => void;
    setIsAddUnitModalOpen: (isOpen: boolean) => void;
    setIsAddDosageModalOpen: (isOpen: boolean) => void;
    setIsAddManufacturerModalOpen: (isOpen: boolean) => void;
    setCategories: (categories: ItemCategory[]) => void;
    setTypes: (types: ItemTypeEntity[]) => void;
    setPackages: (packages: ItemPackage[]) => void;
    setUnits: (units: ItemUnitEntity[]) => void;
    setDosages: (dosages: ItemDosageEntity[]) => void;
    setManufacturers: (manufacturers: ItemManufacturerEntity[]) => void;
    updateFormData: (data: Partial<ItemFormData>) => void;
  };
  mutations: {
    saveCategory: (data: EntitySaveData) => Promise<EntitySaveResult>;
    saveType: (data: EntitySaveData) => Promise<EntitySaveResult>;
    saveUnit: (
      data: Omit<EntitySaveData, 'address'>
    ) => Promise<EntitySaveResult>;
    saveDosage: (data: EntitySaveData) => Promise<EntitySaveResult>;
    saveManufacturer: (
      data: Omit<EntitySaveData, 'description'> & { address?: string }
    ) => Promise<EntitySaveResult>;
  };
}

/**
 * Hook for orchestrating modal operations and entity creation workflows
 *
 * Handles:
 * - Modal state management
 * - Entity creation workflows
 * - Form data updates after entity creation
 */
export const useItemModalOrchestrator = ({
  formState,
  mutations,
}: UseItemModalOrchestratorProps) => {
  // Modal opening handlers
  const handleAddNewCategory = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddEditModalOpen(true);
    },
    [formState]
  );

  const handleAddNewType = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddTypeModalOpen(true);
    },
    [formState]
  );

  const handleAddNewUnit = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddUnitModalOpen(true);
    },
    [formState]
  );

  const handleAddNewDosage = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddDosageModalOpen(true);
    },
    [formState]
  );

  const handleAddNewManufacturer = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddManufacturerModalOpen(true);
    },
    [formState]
  );

  // Modal closing and search term clearing utility
  const clearSearchTerm = useCallback(() => {
    formState.setCurrentSearchTermForModal(undefined);
  }, [formState]);

  const closeModalAndClearSearch = useCallback(
    (modalSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
      modalSetter(false);
      clearSearchTerm();
    },
    [clearSearchTerm]
  );

  // Entity save handlers with modal closing
  const handleSaveCategory = useCallback(
    async (categoryData: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newCategory, updatedCategories } =
          await mutations.saveCategory(categoryData);
        if (updatedCategories) formState.setCategories(updatedCategories);
        if (newCategory?.id)
          formState.updateFormData({ category_id: newCategory.id });
        formState.setIsAddEditModalOpen(false);
        clearSearchTerm();
      } catch {
        toast.error('Gagal menyimpan kategori baru.');
      }
    },
    [mutations, formState, clearSearchTerm]
  );

  const handleSaveType = useCallback(
    async (typeData: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newType, updatedTypes } = await mutations.saveType(typeData);
        if (updatedTypes) formState.setTypes(updatedTypes);
        if (newType?.id) formState.updateFormData({ type_id: newType.id });
        formState.setIsAddTypeModalOpen(false);
        clearSearchTerm();
      } catch {
        toast.error('Gagal menyimpan jenis item baru.');
      }
    },
    [mutations, formState, clearSearchTerm]
  );

  const handleSaveUnit = useCallback(
    async (unitData: { code?: string; name: string; description?: string }) => {
      try {
        const { newUnit, updatedPackages } = await mutations.saveUnit(unitData);
        if (updatedPackages) formState.setPackages(updatedPackages);
        if (newUnit?.id) formState.updateFormData({ package_id: newUnit.id });
        formState.setIsAddUnitModalOpen(false);
        clearSearchTerm();
      } catch {
        toast.error('Gagal menyimpan satuan baru.');
      }
    },
    [mutations, formState, clearSearchTerm]
  );

  const handleSaveDosage = useCallback(
    async (dosageData: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newDosage, updatedDosages } =
          await mutations.saveDosage(dosageData);
        if (updatedDosages) formState.setDosages(updatedDosages);
        if (newDosage?.id)
          formState.updateFormData({ dosage_id: newDosage.id });
        formState.setIsAddDosageModalOpen(false);
        clearSearchTerm();
      } catch {
        toast.error('Gagal menyimpan sediaan baru.');
      }
    },
    [mutations, formState, clearSearchTerm]
  );

  const handleSaveManufacturer = useCallback(
    async (manufacturerData: {
      code?: string;
      name: string;
      address?: string;
    }) => {
      try {
        const { newManufacturer, updatedManufacturers } =
          await mutations.saveManufacturer(manufacturerData);
        if (updatedManufacturers)
          formState.setManufacturers(updatedManufacturers);
        if (newManufacturer?.id)
          formState.updateFormData({ manufacturer_id: newManufacturer.id });
        formState.setIsAddManufacturerModalOpen(false);
        clearSearchTerm();
      } catch {
        toast.error('Gagal menyimpan produsen baru.');
      }
    },
    [mutations, formState, clearSearchTerm]
  );

  return {
    // Modal opening handlers
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,

    // Entity save handlers
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleSaveDosage,
    handleSaveManufacturer,

    // Utility functions
    closeModalAndClearSearch,
    clearSearchTerm,
  };
};
