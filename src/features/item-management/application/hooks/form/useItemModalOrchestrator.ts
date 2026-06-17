import { useCallback, useEffect, useRef } from 'react';
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

type ModalSaveKey = 'category' | 'type' | 'unit' | 'dosage' | 'manufacturer';

class StaleModalSaveError extends Error {
  constructor() {
    super('Stale modal save ignored');
  }
}

const isStaleModalSaveError = (error: unknown) =>
  error instanceof StaleModalSaveError;

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
  const mountedRef = useRef(true);
  const modalGenerationRef = useRef<Record<ModalSaveKey, number>>({
    category: 0,
    type: 0,
    unit: 0,
    dosage: 0,
    manufacturer: 0,
  });

  const invalidateAllModalSaves = useCallback(() => {
    (Object.keys(modalGenerationRef.current) as ModalSaveKey[]).forEach(key => {
      modalGenerationRef.current[key] += 1;
    });
  }, []);

  const nextModalGeneration = useCallback((key: ModalSaveKey) => {
    modalGenerationRef.current[key] += 1;
    return modalGenerationRef.current[key];
  }, []);

  const getModalGeneration = useCallback(
    (key: ModalSaveKey) => modalGenerationRef.current[key],
    []
  );

  const assertCurrentModalSave = useCallback(
    (key: ModalSaveKey, generation: number) => {
      if (!mountedRef.current || getModalGeneration(key) !== generation) {
        throw new StaleModalSaveError();
      }
    },
    [getModalGeneration]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      invalidateAllModalSaves();
    };
  }, [invalidateAllModalSaves]);

  // Modal opening handlers
  const handleAddNewCategory = useCallback(
    (searchTerm?: string) => {
      nextModalGeneration('category');
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddEditModalOpen(true);
    },
    [formState, nextModalGeneration]
  );

  const handleAddNewType = useCallback(
    (searchTerm?: string) => {
      nextModalGeneration('type');
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddTypeModalOpen(true);
    },
    [formState, nextModalGeneration]
  );

  const handleAddNewUnit = useCallback(
    (searchTerm?: string) => {
      nextModalGeneration('unit');
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddUnitModalOpen(true);
    },
    [formState, nextModalGeneration]
  );

  const handleAddNewDosage = useCallback(
    (searchTerm?: string) => {
      nextModalGeneration('dosage');
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddDosageModalOpen(true);
    },
    [formState, nextModalGeneration]
  );

  const handleAddNewManufacturer = useCallback(
    (searchTerm?: string) => {
      nextModalGeneration('manufacturer');
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddManufacturerModalOpen(true);
    },
    [formState, nextModalGeneration]
  );

  // Modal closing and search term clearing utility
  const clearSearchTerm = useCallback(() => {
    formState.setCurrentSearchTermForModal(undefined);
  }, [formState]);

  const closeModalAndClearSearch = useCallback(
    (modalSetter: (isOpen: boolean) => void) => {
      invalidateAllModalSaves();
      modalSetter(false);
      clearSearchTerm();
    },
    [clearSearchTerm, invalidateAllModalSaves]
  );

  // Entity save handlers with modal closing
  const handleSaveCategory = useCallback(
    async (categoryData: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const saveGeneration = getModalGeneration('category');

      try {
        const { newCategory, updatedCategories } =
          await mutations.saveCategory(categoryData);
        assertCurrentModalSave('category', saveGeneration);
        if (updatedCategories) formState.setCategories(updatedCategories);
        if (newCategory?.id)
          formState.updateFormData({ category_id: newCategory.id });
        formState.setIsAddEditModalOpen(false);
        clearSearchTerm();
      } catch (error) {
        if (isStaleModalSaveError(error)) throw error;
        toast.error('Gagal menyimpan kategori baru.');
      }
    },
    [
      mutations,
      formState,
      clearSearchTerm,
      getModalGeneration,
      assertCurrentModalSave,
    ]
  );

  const handleSaveType = useCallback(
    async (typeData: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const saveGeneration = getModalGeneration('type');

      try {
        const { newType, updatedTypes } = await mutations.saveType(typeData);
        assertCurrentModalSave('type', saveGeneration);
        if (updatedTypes) formState.setTypes(updatedTypes);
        if (newType?.id) formState.updateFormData({ type_id: newType.id });
        formState.setIsAddTypeModalOpen(false);
        clearSearchTerm();
      } catch (error) {
        if (isStaleModalSaveError(error)) throw error;
        toast.error('Gagal menyimpan jenis item baru.');
      }
    },
    [
      mutations,
      formState,
      clearSearchTerm,
      getModalGeneration,
      assertCurrentModalSave,
    ]
  );

  const handleSaveUnit = useCallback(
    async (unitData: { code?: string; name: string; description?: string }) => {
      const saveGeneration = getModalGeneration('unit');

      try {
        const { newUnit, updatedPackages } = await mutations.saveUnit(unitData);
        assertCurrentModalSave('unit', saveGeneration);
        if (updatedPackages) formState.setPackages(updatedPackages);
        if (newUnit?.id) formState.updateFormData({ package_id: newUnit.id });
        formState.setIsAddUnitModalOpen(false);
        clearSearchTerm();
      } catch (error) {
        if (isStaleModalSaveError(error)) throw error;
        toast.error('Gagal menyimpan satuan baru.');
      }
    },
    [
      mutations,
      formState,
      clearSearchTerm,
      getModalGeneration,
      assertCurrentModalSave,
    ]
  );

  const handleSaveDosage = useCallback(
    async (dosageData: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const saveGeneration = getModalGeneration('dosage');

      try {
        const { newDosage, updatedDosages } =
          await mutations.saveDosage(dosageData);
        assertCurrentModalSave('dosage', saveGeneration);
        if (updatedDosages) formState.setDosages(updatedDosages);
        if (newDosage?.id)
          formState.updateFormData({ dosage_id: newDosage.id });
        formState.setIsAddDosageModalOpen(false);
        clearSearchTerm();
      } catch (error) {
        if (isStaleModalSaveError(error)) throw error;
        toast.error('Gagal menyimpan sediaan baru.');
      }
    },
    [
      mutations,
      formState,
      clearSearchTerm,
      getModalGeneration,
      assertCurrentModalSave,
    ]
  );

  const handleSaveManufacturer = useCallback(
    async (manufacturerData: {
      code?: string;
      name: string;
      address?: string;
    }) => {
      const saveGeneration = getModalGeneration('manufacturer');

      try {
        const { newManufacturer, updatedManufacturers } =
          await mutations.saveManufacturer(manufacturerData);
        assertCurrentModalSave('manufacturer', saveGeneration);
        if (updatedManufacturers)
          formState.setManufacturers(updatedManufacturers);
        if (newManufacturer?.id)
          formState.updateFormData({ manufacturer_id: newManufacturer.id });
        formState.setIsAddManufacturerModalOpen(false);
        clearSearchTerm();
      } catch (error) {
        if (isStaleModalSaveError(error)) throw error;
        toast.error('Gagal menyimpan produsen baru.');
      }
    },
    [
      mutations,
      formState,
      clearSearchTerm,
      getModalGeneration,
      assertCurrentModalSave,
    ]
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
