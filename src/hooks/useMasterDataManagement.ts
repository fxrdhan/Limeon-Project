import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirmDialog } from '@/components/dialog-box';
import { fuzzyMatch } from '@/utils/search';
import { useAlert } from '@/components/alert/hooks';
import type { PostgrestError } from '@supabase/supabase-js';
import type {
  Supplier,
  Patient,
  Doctor,
  UseMasterDataManagementOptions,
} from '@/types';

// Import regular query hooks (realtime handled at page level)

// Import other hooks
import {
  useSuppliers,
  useSupplierMutations,
  usePatientMutations,
  useDoctorMutations,
  usePatients,
  useDoctors,
} from '@/hooks/queries';

type MasterDataIdentity = Supplier | Patient | Doctor;

// Simplified hook selector - realtime always enabled for simplicity
const getHooksForTable = (tableName: string) => {
  interface QueryOptions {
    enabled?: boolean;
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
  }

  switch (tableName) {
    case 'suppliers':
      return {
        useData: useSuppliers, // No realtime for suppliers yet
        useMutations: useSupplierMutations,
      };
    case 'patients':
      return {
        useData: (options: QueryOptions) => usePatients(options),
        useMutations: usePatientMutations,
      };
    case 'doctors':
      return {
        useData: (options: QueryOptions) => useDoctors(options),
        useMutations: useDoctorMutations,
      };
    default:
      throw new Error(`Unsupported table: ${tableName}`);
  }
};

export const useMasterDataManagement = (
  tableName: string,
  entityNameLabel: string,
  options?: UseMasterDataManagementOptions
) => {
  const { openConfirmDialog } = useConfirmDialog();
  const alert = useAlert();

  const { isCustomModalOpen, searchInputRef, handleSearchChange } =
    options || {};

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIdentity, setEditingIdentity] =
    useState<MasterDataIdentity | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [identitiesPerPage, setIdentitiesPerPage] = useState(10);

  const actualIsModalOpen =
    isCustomModalOpen ?? (isAddModalOpen || isEditModalOpen);

  // Debounce search input with special handling for hashtag
  useEffect(() => {
    // Layer: Empty State Cleanup - When search is completely empty
    if (search === '' || search.trim() === '') {
      // Immediately clear debounced search when input is empty
      if (debouncedSearch !== '') {
        setDebouncedSearch('');
      }
      return;
    }

    // Check if search is in hashtag mode (starts with # but not yet complete)
    const isHashtagMode = search.startsWith('#') && !search.includes(':');
    const isHashtagOnly = search === '#';

    // Don't apply search for incomplete hashtag modes
    if (isHashtagMode || isHashtagOnly) {
      // Clear previous search results when entering hashtag mode
      if (debouncedSearch !== '') {
        setDebouncedSearch('');
      }
      return;
    }

    // Use longer delay for hashtag completion to ensure smooth UX
    const delay = search.startsWith('#') && search.includes(':') ? 150 : 300;

    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  // Clear editing identity when modal closes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isEditModalOpen && editingIdentity) {
      timer = setTimeout(() => {
        setEditingIdentity(null);
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [editingIdentity, isEditModalOpen]);

  // Global keyboard handler for auto-focus search
  useEffect(() => {
    if (!searchInputRef || !handleSearchChange) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      try {
        const target = e.target as HTMLElement;
        const isInputFocused =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
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
        console.error('Error in global keydown handler:', error);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [searchInputRef, handleSearchChange, actualIsModalOpen]);

  // Get the appropriate hooks for this table - realtime always enabled
  const hooks = getHooksForTable(tableName);

  // Use the appropriate data hook
  const {
    data: allData = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = hooks.useData({
    enabled: true,
  });

  // Get mutations
  const mutations = hooks.useMutations();

  // Filter and paginate data locally
  const { currentData, totalItems: totalEntities } = useMemo(() => {
    let filteredData = allData as MasterDataIdentity[];

    // Apply search filter
    if (debouncedSearch) {
      const searchTermLower = debouncedSearch.toLowerCase();

      // Standard filtering for master data (suppliers, patients, doctors)
      filteredData = filteredData
        .filter(identity => {
          // Check for code field if it exists (all master data now uses 'code')
          if (
            'code' in identity &&
            typeof identity.code === 'string' &&
            fuzzyMatch(identity.code.toLowerCase(), searchTermLower)
          )
            return true;
          if (identity.name && fuzzyMatch(identity.name, searchTermLower))
            return true;
          if (
            'description' in identity &&
            typeof identity.description === 'string' &&
            fuzzyMatch(identity.description, searchTermLower)
          )
            return true;
          if (
            'address' in identity &&
            typeof identity.address === 'string' &&
            fuzzyMatch(identity.address, searchTermLower)
          )
            return true;

          if (tableName === 'suppliers') {
            const supplier = identity as Supplier;
            if (
              supplier.address &&
              fuzzyMatch(supplier.address, searchTermLower)
            )
              return true;
            if (supplier.phone && fuzzyMatch(supplier.phone, searchTermLower))
              return true;
            if (supplier.email && fuzzyMatch(supplier.email, searchTermLower))
              return true;
            if (
              supplier.contact_person &&
              fuzzyMatch(supplier.contact_person, searchTermLower)
            )
              return true;
          } else if (tableName === 'patients') {
            const patient = identity as Patient;
            if (patient.gender && fuzzyMatch(patient.gender, searchTermLower))
              return true;
            if (patient.address && fuzzyMatch(patient.address, searchTermLower))
              return true;
            if (patient.phone && fuzzyMatch(patient.phone, searchTermLower))
              return true;
            if (patient.email && fuzzyMatch(patient.email, searchTermLower))
              return true;
            if (
              patient.birth_date &&
              fuzzyMatch(patient.birth_date.toString(), searchTermLower)
            )
              return true;
          } else if (tableName === 'doctors') {
            const doctor = identity as Doctor;
            if (
              doctor.specialization &&
              fuzzyMatch(doctor.specialization, searchTermLower)
            )
              return true;
            if (
              doctor.license_number &&
              fuzzyMatch(doctor.license_number, searchTermLower)
            )
              return true;
            if (doctor.phone && fuzzyMatch(doctor.phone, searchTermLower))
              return true;
            if (doctor.email && fuzzyMatch(doctor.email, searchTermLower))
              return true;
            if (
              doctor.experience_years &&
              fuzzyMatch(doctor.experience_years.toString(), searchTermLower)
            )
              return true;
          }
          return false;
        })
        .sort((a, b) => {
          const getScore = (identityToSort: MasterDataIdentity) => {
            // Check code field (all master data tables now use 'code')
            if (
              'code' in identityToSort &&
              typeof identityToSort.code === 'string' &&
              identityToSort.code.toLowerCase().startsWith(searchTermLower)
            )
              return 5;
            if (
              'code' in identityToSort &&
              typeof identityToSort.code === 'string' &&
              identityToSort.code.toLowerCase().includes(searchTermLower)
            )
              return 4;
            // Then check name
            if (
              identityToSort.name &&
              identityToSort.name.toLowerCase().startsWith(searchTermLower)
            )
              return 3;
            if (
              identityToSort.name &&
              identityToSort.name.toLowerCase().includes(searchTermLower)
            )
              return 2;
            if (
              identityToSort.name &&
              fuzzyMatch(identityToSort.name, searchTermLower)
            )
              return 1;
            return 0;
          };
          const scoreA = getScore(a);
          const scoreB = getScore(b);
          if (scoreA !== scoreB) return scoreB - scoreA;
          // Secondary sort by code if available, then name
          if (
            'code' in a &&
            'code' in b &&
            typeof a.code === 'string' &&
            typeof b.code === 'string'
          ) {
            return a.code.localeCompare(b.code);
          }
          return a.name.localeCompare(b.name);
        });
    }

    // Apply pagination
    const totalEntities = filteredData.length;
    const startIndex = (currentPage - 1) * identitiesPerPage;
    const endIndex = startIndex + identitiesPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      currentData: paginatedData,
      totalItems: totalEntities,
    };
  }, [allData, debouncedSearch, currentPage, identitiesPerPage, tableName]);

  const queryError = error instanceof Error ? error : null;

  const handleEdit = useCallback((identity: MasterDataIdentity) => {
    setEditingIdentity(identity);
    setIsEditModalOpen(true);
  }, []);

  const handleModalSubmit = useCallback(
    async (identityData: {
      id?: string;
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        if (identityData.id) {
          // Update existing identity
          const updateMutation =
            ('updateSupplier' in mutations && mutations.updateSupplier) ||
            ('updatePatient' in mutations && mutations.updatePatient) ||
            ('updateDoctor' in mutations && mutations.updateDoctor);

          if (
            updateMutation &&
            typeof updateMutation === 'object' &&
            'mutateAsync' in updateMutation
          ) {
            const updateData: Record<string, unknown> = {
              name: identityData.name,
            };
            if (identityData.description !== undefined) {
              updateData.description = identityData.description;
            }
            if (identityData.address !== undefined) {
              updateData.address = identityData.address;
            }
            // Handle code field properly for different tables
            if (identityData.code !== undefined) {
              // Since this hook is used by legacy components, keep the simple field assignment
              updateData.code = identityData.code;
            }

            // For specific mutations (suppliers, patients, doctors), use nested data structure
            await (
              updateMutation as unknown as {
                mutateAsync: (params: {
                  id: string;
                  data: Record<string, unknown>;
                }) => Promise<unknown>;
              }
            ).mutateAsync({
              id: identityData.id!,
              data: updateData,
            });
          }
        } else {
          // Create new identity
          const createMutation =
            ('createSupplier' in mutations && mutations.createSupplier) ||
            ('createPatient' in mutations && mutations.createPatient) ||
            ('createDoctor' in mutations && mutations.createDoctor);

          if (
            createMutation &&
            typeof createMutation === 'object' &&
            'mutateAsync' in createMutation
          ) {
            const createData: Record<string, unknown> = {
              name: identityData.name,
            };
            if (identityData.description !== undefined) {
              createData.description = identityData.description;
            }
            if (identityData.address !== undefined) {
              createData.address = identityData.address;
            }
            // Handle code field properly for different tables
            if (identityData.code !== undefined) {
              // Since this hook is used by legacy components, keep the simple field assignment
              createData.code = identityData.code;
            }
            // Cast to unknown first to avoid type conflicts, then cast to mutation interface
            await (
              createMutation as unknown as {
                mutateAsync: (
                  data: Record<string, unknown>
                ) => Promise<unknown>;
              }
            ).mutateAsync(createData);
          }
        }

        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setEditingIdentity(null);

        // Manually refetch to ensure current tab updates immediately after mutation
        refetch();
      } catch (error: unknown) {
        // Check for duplicate code constraint error (409 Conflict)
        // PostgrestError structure: {message: string, details: string, hint: string, code: string}
        const isPostgrestError = (err: unknown): err is PostgrestError => {
          return (
            typeof err === 'object' &&
            err !== null &&
            'message' in err &&
            'code' in err
          );
        };

        const errorMessage = isPostgrestError(error)
          ? error.message
          : (typeof error === 'string' ? error : String(error)) ||
            'Unknown error';
        const errorDetails = isPostgrestError(error)
          ? (error.details ?? '')
          : '';
        const errorCode = isPostgrestError(error) ? (error.code ?? '') : '';

        const isDuplicateCodeError =
          errorCode === '23505' || // PostgreSQL unique violation code
          errorMessage.includes('unique constraint') ||
          errorMessage.includes('duplicate key value') ||
          errorMessage.includes('violates unique constraint') ||
          errorDetails.includes('already exists') ||
          errorMessage.includes('already exists') ||
          (errorMessage.includes('409') && errorMessage.includes('conflict'));

        const action = identityData.id ? 'memperbarui' : 'menambahkan';
        const codeValue = identityData.code;

        if (isDuplicateCodeError && codeValue) {
          alert.error(
            `Kode "${codeValue}" sudah digunakan oleh ${entityNameLabel.toLowerCase()} lain. ` +
              `Silakan gunakan kode yang berbeda.`
          );
        } else {
          alert.error(`Gagal ${action} ${entityNameLabel}: ${errorMessage}`);
        }
      }
    },
    [mutations, entityNameLabel, alert, refetch]
  );

  const handleDelete = useCallback(
    async (identityId: string) => {
      try {
        const deleteMutation =
          ('deleteSupplier' in mutations && mutations.deleteSupplier) ||
          ('deletePatient' in mutations && mutations.deletePatient) ||
          ('deleteDoctor' in mutations && mutations.deleteDoctor);

        if (
          deleteMutation &&
          typeof deleteMutation === 'object' &&
          'mutateAsync' in deleteMutation
        ) {
          // Cast to unknown first to avoid type conflicts, then cast to mutation interface
          await (
            deleteMutation as unknown as {
              mutateAsync: (id: string) => Promise<unknown>;
            }
          ).mutateAsync(identityId);
        }

        setIsEditModalOpen(false);
        setEditingIdentity(null);

        // Manually refetch to ensure current tab updates immediately after mutation
        refetch();
      } catch (error) {
        // Check for foreign key constraint error for delete operations
        const isForeignKeyError =
          error instanceof Error &&
          (error.message.includes('foreign key constraint') ||
            error.message.includes('violates foreign key') ||
            error.message.includes('still referenced'));

        if (isForeignKeyError) {
          alert.error(
            `Tidak dapat menghapus ${entityNameLabel.toLowerCase()} karena masih digunakan di data lain. ` +
              `Hapus terlebih dahulu data yang menggunakannya.`
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          alert.error(`Gagal menghapus ${entityNameLabel}: ${errorMessage}`);
        }
      }
    },
    [mutations, entityNameLabel, alert, refetch]
  );

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const handleIdentitiesPerPageChange = (
    newIdentitiesPerPage: number | React.ChangeEvent<HTMLSelectElement>
  ) => {
    // Handle both number and event for backward compatibility
    const value =
      typeof newIdentitiesPerPage === 'number'
        ? newIdentitiesPerPage
        : Number(newIdentitiesPerPage.target.value);
    setIdentitiesPerPage(value);
    setCurrentPage(1);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        if (currentData.length > 0) {
          const firstIdentity = currentData[0] as MasterDataIdentity;
          handleEdit(firstIdentity);
        } else if (debouncedSearch.trim() !== '') {
          setIsAddModalOpen(true);
        }
      }
    },
    [currentData, handleEdit, debouncedSearch]
  );

  const totalPages = Math.ceil(totalEntities / identitiesPerPage);

  // Create mutation objects with consistent interface for backward compatibility
  const addMutation = {
    mutate: (data: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => handleModalSubmit(data),
    mutateAsync: (data: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => handleModalSubmit(data),
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find(
        (mutation: unknown) => {
          const m = mutation as { error?: Error };
          return m?.error;
        }
      ) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  const updateMutation = {
    mutate: (data: {
      id: string;
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => handleModalSubmit(data),
    mutateAsync: (data: {
      id: string;
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => handleModalSubmit(data),
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find(
        (mutation: unknown) => {
          const m = mutation as { error?: Error };
          return m?.error;
        }
      ) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  const deleteMutation = {
    mutate: (identityId: string) => handleDelete(identityId),
    mutateAsync: (identityId: string) => handleDelete(identityId),
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find(
        (mutation: unknown) => {
          const m = mutation as { error?: Error };
          return m?.error;
        }
      ) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  return {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem: editingIdentity,
    setEditingItem: setEditingIdentity,
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage: identitiesPerPage,
    setItemsPerPage: setIdentitiesPerPage,
    data: currentData,
    totalItems: totalEntities,
    totalPages,
    isLoading,
    isError,
    queryError,
    isFetching, // Now use actual isFetching from React Query
    isPlaceholderData, // Indicates if data is from cache or fresh
    addMutation,
    updateMutation,
    deleteMutation,
    handleEdit,
    handleModalSubmit,
    handlePageChange,
    handleItemsPerPageChange: handleIdentitiesPerPageChange,
    handleKeyDown,
    openConfirmDialog,
    // Note: queryClient is not needed in new architecture as mutations handle cache updates
    queryClient: null,
  };
};
