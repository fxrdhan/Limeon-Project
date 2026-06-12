import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react';
import { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import { useAlert } from '@/components/alert/hooks';
import { StorageService } from '@/services/api/storage.service';
import type { UseMasterDataManagementOptions } from '@/types';
import { normalizeMasterDataAutosaveField } from './master-data-management/autosave';
import {
  getMasterDataErrorMessage,
  isDuplicateCodeError,
  isForeignKeyDeleteError,
} from './master-data-management/errors';
import { filterMasterDataIdentities } from './master-data-management/filtering';
import {
  getIdentityImageUrl,
  IDENTITY_IMAGE_BUCKET,
  IMAGE_ENABLED_TABLES,
} from './master-data-management/identityImages';
import {
  getMasterDataCreateMutation,
  getMasterDataDeleteMutation,
  getMasterDataUpdateMutation,
} from './master-data-management/mutations';
import { getHooksForTable } from './master-data-management/tableHooks';
import type { MasterDataIdentity } from './master-data-management/types';

export const useMasterDataManagement = (
  tableName: string,
  entityNameLabel: string,
  options?: UseMasterDataManagementOptions
) => {
  const { openConfirmDialog } = useConfirmDialog();
  const alert = useAlert();

  const { enabled = true } = options || {};

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIdentity, setEditingIdentity] =
    useState<MasterDataIdentity | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [identitiesPerPage, setIdentitiesPerPage] = useState(25);

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
    enabled,
  });

  // Get mutations
  const mutations = hooks.useMutations();

  // Filter locally; AG Grid owns pagination and page-size state.
  const { currentData, totalItems: totalEntities } = useMemo(() => {
    const filteredData = filterMasterDataIdentities({
      data: allData as MasterDataIdentity[],
      searchTerm: debouncedSearch,
      tableName,
    });

    const totalEntities = filteredData.length;

    return {
      currentData: filteredData,
      totalItems: totalEntities,
    };
  }, [allData, debouncedSearch, tableName]);

  const queryError = error instanceof Error ? error : null;

  const handleEdit = useCallback((identity: MasterDataIdentity) => {
    setEditingIdentity(identity);
    setIsEditModalOpen(true);
  }, []);

  const getUpdateMutation = useCallback(() => {
    return getMasterDataUpdateMutation(mutations);
  }, [mutations]);

  const handleFieldAutosave = useCallback(
    async (
      identityId: string | undefined,
      fieldKey: string,
      value: unknown
    ): Promise<void> => {
      if (!identityId) return;

      const updateMutation = getUpdateMutation();
      if (!updateMutation) {
        return;
      }

      const normalizedField = normalizeMasterDataAutosaveField(
        tableName,
        fieldKey,
        value
      );
      if (!normalizedField) return;

      await updateMutation.mutateAsync({
        id: identityId,
        data: { [normalizedField.key]: normalizedField.value },
        options: { silent: true },
      });

      setEditingIdentity(prev => {
        if (!prev || prev.id !== identityId) {
          return prev;
        }

        return {
          ...prev,
          [normalizedField.key]: normalizedField.value,
        };
      });
    },
    [getUpdateMutation, tableName]
  );

  const handleImageSave = useCallback(
    async ({
      entityId,
      file,
    }: {
      entityId?: string;
      file: File;
    }): Promise<string | void> => {
      if (!entityId || !IMAGE_ENABLED_TABLES.has(tableName)) return;

      const updateMutation = getUpdateMutation();
      if (!updateMutation) {
        return;
      }

      const extension =
        file.name.split('.').pop()?.toLowerCase().trim() || 'jpg';
      const nextImagePath = `${tableName}/${entityId}/image.${extension}`;
      const existingImageUrl =
        editingIdentity?.id === entityId
          ? getIdentityImageUrl(editingIdentity)
          : getIdentityImageUrl(
              (allData as MasterDataIdentity[]).find(
                identity => identity.id === entityId
              )
            );

      const { publicUrl } = await StorageService.uploadFile(
        IDENTITY_IMAGE_BUCKET,
        file,
        nextImagePath
      );

      const oldImagePath =
        typeof existingImageUrl === 'string'
          ? StorageService.extractPathFromUrl(
              existingImageUrl,
              IDENTITY_IMAGE_BUCKET
            )
          : null;
      const expectedImagePathPrefix = `${tableName}/${entityId}/`;
      if (
        oldImagePath &&
        oldImagePath !== nextImagePath &&
        oldImagePath.startsWith(expectedImagePathPrefix)
      ) {
        await StorageService.deleteEntityImage(
          IDENTITY_IMAGE_BUCKET,
          oldImagePath
        );
      }

      await updateMutation.mutateAsync({
        id: entityId,
        data: { image_url: publicUrl },
        options: { silent: true },
      });

      setEditingIdentity(prev => {
        if (!prev || prev.id !== entityId) {
          return prev;
        }
        return {
          ...prev,
          image_url: publicUrl,
        } as MasterDataIdentity;
      });

      await refetch();
      return publicUrl;
    },
    [tableName, getUpdateMutation, editingIdentity, allData, refetch]
  );

  const handleImageDelete = useCallback(
    async (entityId?: string): Promise<void> => {
      if (!entityId || !IMAGE_ENABLED_TABLES.has(tableName)) return;

      const updateMutation = getUpdateMutation();
      if (!updateMutation) {
        return;
      }

      const existingImageUrl =
        editingIdentity?.id === entityId
          ? getIdentityImageUrl(editingIdentity)
          : getIdentityImageUrl(
              (allData as MasterDataIdentity[]).find(
                identity => identity.id === entityId
              )
            );

      const oldImagePath =
        typeof existingImageUrl === 'string'
          ? StorageService.extractPathFromUrl(
              existingImageUrl,
              IDENTITY_IMAGE_BUCKET
            )
          : null;
      if (oldImagePath) {
        await StorageService.deleteEntityImage(
          IDENTITY_IMAGE_BUCKET,
          oldImagePath
        );
      }

      await updateMutation.mutateAsync({
        id: entityId,
        data: { image_url: null },
        options: { silent: true },
      });

      setEditingIdentity(prev => {
        if (!prev || prev.id !== entityId) {
          return prev;
        }
        return {
          ...prev,
          image_url: null,
        } as MasterDataIdentity;
      });

      await refetch();
    },
    [tableName, getUpdateMutation, editingIdentity, allData, refetch]
  );

  const handleModalSubmit = useCallback(
    async (identityData: {
      id?: string;
      code?: string;
      name?: string;
      description?: string;
      address?: string;
      data?: Record<string, unknown>;
    }): Promise<unknown> => {
      try {
        const defaultData: Record<string, unknown> = {};
        if (identityData.name !== undefined) {
          defaultData.name = identityData.name;
        }
        if (identityData.description !== undefined) {
          defaultData.description = identityData.description;
        }
        if (identityData.address !== undefined) {
          defaultData.address = identityData.address;
        }
        if (identityData.code !== undefined) {
          defaultData.code = identityData.code;
        }

        const payloadData = identityData.data ?? defaultData;

        let mutationResult: unknown;

        if (identityData.id) {
          const updateMutation = getUpdateMutation();

          if (updateMutation) {
            mutationResult = await updateMutation.mutateAsync({
              id: identityData.id!,
              data: payloadData,
            });
          }
        } else {
          const createMutation = getMasterDataCreateMutation(mutations);

          if (createMutation) {
            mutationResult = await createMutation.mutateAsync(payloadData);
          }
        }

        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setEditingIdentity(null);

        // Manually refetch to ensure current tab updates immediately after mutation
        await refetch();
        return mutationResult;
      } catch (error: unknown) {
        const errorMessage = getMasterDataErrorMessage(error);
        const action = identityData.id ? 'memperbarui' : 'menambahkan';
        const codeValue = identityData.code;

        if (isDuplicateCodeError(error) && codeValue) {
          alert.error(
            `Kode "${codeValue}" sudah digunakan oleh ${entityNameLabel.toLowerCase()} lain. ` +
              `Silakan gunakan kode yang berbeda.`
          );
        } else {
          alert.error(`Gagal ${action} ${entityNameLabel}: ${errorMessage}`);
        }
        throw error;
      }
    },
    [getUpdateMutation, mutations, entityNameLabel, alert, refetch]
  );

  const handleDelete = useCallback(
    async (identityId: string) => {
      try {
        const deleteMutation = getMasterDataDeleteMutation(mutations);

        if (deleteMutation) {
          await deleteMutation.mutateAsync(identityId);
        }

        setIsEditModalOpen(false);
        setEditingIdentity(null);

        // Manually refetch to ensure current tab updates immediately after mutation
        await refetch();
      } catch (error) {
        if (isForeignKeyDeleteError(error)) {
          alert.error(
            `Tidak dapat menghapus ${entityNameLabel.toLowerCase()} karena masih digunakan di data lain. ` +
              `Hapus terlebih dahulu data yang menggunakannya.`
          );
        } else {
          const errorMessage = getMasterDataErrorMessage(error);
          alert.error(`Gagal menghapus ${entityNameLabel}: ${errorMessage}`);
        }
      }
    },
    [mutations, entityNameLabel, alert, refetch]
  );

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const handleIdentitiesPerPageChange = (newIdentitiesPerPage: number) => {
    setIdentitiesPerPage(newIdentitiesPerPage);
    setCurrentPage(1);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
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
    handleEdit,
    handleModalSubmit,
    handleDelete,
    handleFieldAutosave,
    handleImageSave,
    handleImageDelete,
    handlePageChange,
    handleItemsPerPageChange: handleIdentitiesPerPageChange,
    handleKeyDown,
    openConfirmDialog,
    // Note: queryClient is not needed in new architecture as mutations handle cache updates
    queryClient: null,
  };
};
