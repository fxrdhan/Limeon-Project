import { useState, useEffect, useCallback, useMemo } from "react";
import { useConfirmDialog } from "@/components/dialog-box";
import { fuzzyMatch, getScore } from "@/utils/search";
import { useAlert } from "@/components/alert/hooks";
import type {
  Category,
  ItemType,
  Unit,
  Item,
  Supplier,
  Patient,
  Doctor,
  UseMasterDataManagementOptions,
} from "@/types";

// Import our new modular services and hooks
import {
  useCategories,
  useCategoryMutations,
  useMedicineTypes,
  useMedicineTypeMutations,
  useUnits,
  useUnitMutations,
  useSuppliers,
  useSupplierMutations,
  useItems,
  useItemMutations,
  usePatients,
  usePatientMutations,
  useDoctors,
  useDoctorMutations,
} from "@/hooks/queries";

type MasterDataItem = Category | ItemType | Unit | Item | Supplier | Patient | Doctor;

// Hook selector factory to get the right hooks for each table
const getHooksForTable = (tableName: string) => {
  switch (tableName) {
    case "item_categories":
      return {
        useData: useCategories,
        useMutations: useCategoryMutations,
      };
    case "item_types":
      return {
        useData: useMedicineTypes,
        useMutations: useMedicineTypeMutations,
      };
    case "item_units":
      return {
        useData: useUnits,
        useMutations: useUnitMutations,
      };
    case "suppliers":
      return {
        useData: useSuppliers,
        useMutations: useSupplierMutations,
      };
    case "items":
      return {
        useData: useItems,
        useMutations: useItemMutations,
      };
    case "patients":
      return {
        useData: usePatients,
        useMutations: usePatientMutations,
      };
    case "doctors":
      return {
        useData: useDoctors,
        useMutations: useDoctorMutations,
      };
    default:
      throw new Error(`Unsupported table: ${tableName}`);
  }
};

export const useMasterDataManagement = (
  tableName: string,
  entityNameLabel: string,
  options?: UseMasterDataManagementOptions,
) => {
  const { openConfirmDialog } = useConfirmDialog();
  const alert = useAlert();

  const {
    isCustomModalOpen,
    searchInputRef,
    handleSearchChange,
  } = options || {};

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const actualIsModalOpen =
    isCustomModalOpen ?? (isAddModalOpen || isEditModalOpen);

  // Debounce search input with special handling for hashtag
  useEffect(() => {
    // Layer: Empty State Cleanup - When search is completely empty
    if (search === "" || search.trim() === "") {
      // Immediately clear debounced search when input is empty
      if (debouncedSearch !== "") {
        setDebouncedSearch("");
      }
      return;
    }
    
    // Check if search is in hashtag mode (starts with # but not yet complete)
    const isHashtagMode = search.startsWith("#") && !search.includes(":");
    const isHashtagOnly = search === "#";
    
    // Don't apply search for incomplete hashtag modes
    if (isHashtagMode || isHashtagOnly) {
      // Clear previous search results when entering hashtag mode
      if (debouncedSearch !== "") {
        setDebouncedSearch("");
      }
      return;
    }
    
    // Use longer delay for hashtag completion to ensure smooth UX
    const delay = search.startsWith("#") && search.includes(":") ? 150 : 300;
    
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  // Clear editing item when modal closes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isEditModalOpen && editingItem) {
      timer = setTimeout(() => {
        setEditingItem(null);
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [editingItem, isEditModalOpen]);

  // Global keyboard handler for auto-focus search
  useEffect(() => {
    if (!searchInputRef || !handleSearchChange) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      try {
        const target = e.target as HTMLElement;
        const isInputFocused =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        const isModalOpen = actualIsModalOpen;
        const isTypeable =
          /^[a-zA-Z0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~#]$/.test(e.key);

        if (
          !isInputFocused &&
          !isModalOpen &&
          isTypeable &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey &&
          searchInputRef.current
        ) {
          e.preventDefault();
          searchInputRef.current.focus();

          // Create a synthetic change event
          const syntheticEvent = {
            target: { value: e.key },
          } as React.ChangeEvent<HTMLInputElement>;
          handleSearchChange(syntheticEvent);
        }
      } catch (error) {
        console.error("Error in global keydown handler:", error);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [searchInputRef, handleSearchChange, actualIsModalOpen]);

  // Get the appropriate hooks for this table
  const hooks = getHooksForTable(tableName);
  
  // Use the appropriate data hook
  const { data: allData = [], isLoading, isError, error } = hooks.useData({
    enabled: true,
  });

  // Get mutations
  const mutations = hooks.useMutations();

  // Filter and paginate data locally
  const { currentData, totalItems } = useMemo(() => {
    let filteredData = allData as MasterDataItem[];

    // Apply search filter
    if (debouncedSearch) {
      const searchTermLower = debouncedSearch.toLowerCase();
      
      if (tableName === "items") {
        // Special handling for items with complex search
        filteredData = (allData as Item[])
          .filter((item) => {
            return (
              fuzzyMatch(item.name, searchTermLower) ||
              (item.code && fuzzyMatch(item.code, searchTermLower)) ||
              (item.barcode && fuzzyMatch(item.barcode, searchTermLower)) ||
              (item.category?.name && fuzzyMatch(item.category.name, searchTermLower)) ||
              (item.type?.name && fuzzyMatch(item.type.name, searchTermLower)) ||
              (item.unit?.name && fuzzyMatch(item.unit.name, searchTermLower)) ||
              (item.base_price && fuzzyMatch(item.base_price.toString(), searchTermLower)) ||
              (item.sell_price && fuzzyMatch(item.sell_price.toString(), searchTermLower)) ||
              (item.stock && fuzzyMatch(item.stock.toString(), searchTermLower)) ||
              (item.unit_conversions &&
                item.unit_conversions.some(
                  (uc) => uc.unit?.name && fuzzyMatch(uc.unit.name, searchTermLower),
                ))
            );
          })
          .sort((a, b) => {
            const scoreA = getScore(a, searchTermLower);
            const scoreB = getScore(b, searchTermLower);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
          });
      } else {
        // Standard filtering for other master data
        filteredData = filteredData
          .filter((item) => {
            if (item.name && fuzzyMatch(item.name, searchTermLower)) return true;
            if (
              "description" in item &&
              typeof item.description === "string" &&
              fuzzyMatch(item.description, searchTermLower)
            ) return true;
            
            if (tableName === "suppliers") {
              const supplier = item as Supplier;
              if (supplier.address && fuzzyMatch(supplier.address, searchTermLower)) return true;
              if (supplier.phone && fuzzyMatch(supplier.phone, searchTermLower)) return true;
              if (supplier.email && fuzzyMatch(supplier.email, searchTermLower)) return true;
              if (supplier.contact_person && fuzzyMatch(supplier.contact_person, searchTermLower)) return true;
            } else if (tableName === "patients") {
              const patient = item as Patient;
              if (patient.gender && fuzzyMatch(patient.gender, searchTermLower)) return true;
              if (patient.address && fuzzyMatch(patient.address, searchTermLower)) return true;
              if (patient.phone && fuzzyMatch(patient.phone, searchTermLower)) return true;
              if (patient.email && fuzzyMatch(patient.email, searchTermLower)) return true;
              if (patient.birth_date && fuzzyMatch(patient.birth_date.toString(), searchTermLower)) return true;
            } else if (tableName === "doctors") {
              const doctor = item as Doctor;
              if (doctor.specialization && fuzzyMatch(doctor.specialization, searchTermLower)) return true;
              if (doctor.license_number && fuzzyMatch(doctor.license_number, searchTermLower)) return true;
              if (doctor.phone && fuzzyMatch(doctor.phone, searchTermLower)) return true;
              if (doctor.email && fuzzyMatch(doctor.email, searchTermLower)) return true;
              if (doctor.experience_years && fuzzyMatch(doctor.experience_years.toString(), searchTermLower)) return true;
            }
            return false;
          })
          .sort((a, b) => {
            const nameScore = (itemToSort: MasterDataItem) => {
              if (itemToSort.name && itemToSort.name.toLowerCase().startsWith(searchTermLower)) return 3;
              if (itemToSort.name && itemToSort.name.toLowerCase().includes(searchTermLower)) return 2;
              if (itemToSort.name && fuzzyMatch(itemToSort.name, searchTermLower)) return 1;
              return 0;
            };
            const scoreA = nameScore(a);
            const scoreB = nameScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
          });
      }
    }

    // Apply pagination
    const totalItems = filteredData.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      currentData: paginatedData,
      totalItems,
    };
  }, [allData, debouncedSearch, currentPage, itemsPerPage, tableName]);

  const queryError = error instanceof Error ? error : null;

  const handleEdit = useCallback((item: MasterDataItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleModalSubmit = useCallback(
    async (itemData: { id?: string; name: string; description?: string }) => {
      try {
        if (itemData.id) {
          // Update existing item
          const updateMutation = ("updateCategory" in mutations && mutations.updateCategory) ||
                               ("updateMedicineType" in mutations && mutations.updateMedicineType) ||
                               ("updateUnit" in mutations && mutations.updateUnit) ||
                               ("updateSupplier" in mutations && mutations.updateSupplier) ||
                               ("updateItem" in mutations && mutations.updateItem) ||
                               ("updatePatient" in mutations && mutations.updatePatient) ||
                               ("updateDoctor" in mutations && mutations.updateDoctor);
          
          if (updateMutation && typeof updateMutation === 'object' && 'mutateAsync' in updateMutation) {
            const typedMutation = updateMutation as { mutateAsync: (data: { id: string; data: Record<string, unknown> }) => Promise<void> };
            await typedMutation.mutateAsync({
              id: itemData.id,
              data: { name: itemData.name, description: itemData.description },
            });
          }
        } else {
          // Create new item
          const createMutation = ("createCategory" in mutations && mutations.createCategory) ||
                               ("createMedicineType" in mutations && mutations.createMedicineType) ||
                               ("createUnit" in mutations && mutations.createUnit) ||
                               ("createSupplier" in mutations && mutations.createSupplier) ||
                               ("createItem" in mutations && mutations.createItem) ||
                               ("createPatient" in mutations && mutations.createPatient) ||
                               ("createDoctor" in mutations && mutations.createDoctor);
          
          if (createMutation && typeof createMutation === 'object' && 'mutateAsync' in createMutation) {
            const typedMutation = createMutation as { mutateAsync: (data: Record<string, unknown>) => Promise<void> };
            await typedMutation.mutateAsync({
              name: itemData.name,
              description: itemData.description,
            });
          }
        }
        
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setEditingItem(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const action = itemData.id ? "memperbarui" : "menambahkan";
        alert.error(`Gagal ${action} ${entityNameLabel}: ${errorMessage}`);
      }
    },
    [mutations, entityNameLabel, alert],
  );

  const handleDelete = useCallback(
    async (itemId: string) => {
      try {
        const deleteMutation = ("deleteCategory" in mutations && mutations.deleteCategory) ||
                             ("deleteMedicineType" in mutations && mutations.deleteMedicineType) ||
                             ("deleteUnit" in mutations && mutations.deleteUnit) ||
                             ("deleteSupplier" in mutations && mutations.deleteSupplier) ||
                             ("deleteItem" in mutations && mutations.deleteItem) ||
                             ("deletePatient" in mutations && mutations.deletePatient) ||
                             ("deleteDoctor" in mutations && mutations.deleteDoctor);
        
        if (deleteMutation && typeof deleteMutation === 'object' && 'mutateAsync' in deleteMutation) {
          const typedMutation = deleteMutation as { mutateAsync: (id: string) => Promise<void> };
          await typedMutation.mutateAsync(itemId);
        }
        
        setIsEditModalOpen(false);
        setEditingItem(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        alert.error(`Gagal menghapus ${entityNameLabel}: ${errorMessage}`);
      }
    },
    [mutations, entityNameLabel, alert],
  );

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);
  
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();

        if (currentData.length > 0) {
          const firstItem = currentData[0] as MasterDataItem;
          handleEdit(firstItem);
        } else if (debouncedSearch.trim() !== "") {
          setIsAddModalOpen(true);
        }
      }
    },
    [currentData, handleEdit, debouncedSearch],
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage);


  // Create mutation objects with consistent interface for backward compatibility
  const addMutation = {
    mutate: (data: { name: string; description?: string }) => 
      handleModalSubmit(data),
    mutateAsync: (data: { name: string; description?: string }) => 
      handleModalSubmit(data),
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find((mutation: unknown) => {
        const m = mutation as { error?: Error };
        return m?.error;
      }) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  const updateMutation = {
    mutate: (data: { id: string; name: string; description?: string }) => 
      handleModalSubmit(data),
    mutateAsync: (data: { id: string; name: string; description?: string }) => 
      handleModalSubmit(data),
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find((mutation: unknown) => {
        const m = mutation as { error?: Error };
        return m?.error;
      }) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  const deleteMutation = {
    mutate: (itemId: string) => handleDelete(itemId),
    mutateAsync: (itemId: string) => handleDelete(itemId),
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find((mutation: unknown) => {
        const m = mutation as { error?: Error };
        return m?.error;
      }) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  return {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    setEditingItem,
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    data: currentData,
    totalItems,
    totalPages,
    isLoading,
    isError,
    queryError,
    isFetching: isLoading, // Alias for compatibility
    addMutation,
    updateMutation,
    deleteMutation,
    handleEdit,
    handleModalSubmit,
    handlePageChange,
    handleItemsPerPageChange,
    handleKeyDown,
    openConfirmDialog,
    // Note: queryClient is not needed in new architecture as mutations handle cache updates
    queryClient: null,
  };
};