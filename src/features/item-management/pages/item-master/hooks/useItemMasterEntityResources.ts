import { useMemo, type RefObject } from 'react';
import { useEntity } from '@/features/item-management/application/hooks/collections/useEntity';
import { useEntityManager } from '@/features/item-management/application/hooks/collections/useEntityManager';
import { useItemGridColumns } from '@/features/item-management/application/hooks/ui/useItemGridColumns';
import type { MasterDataType } from '@/features/item-management/shared/types';
import { buildEntityColumnDefs } from '../entityColumnDefs';
import { getItemMasterActiveEntityType } from '../itemMasterPageState';

interface UseItemMasterEntityResourcesParams {
  activeTab: MasterDataType;
  isAddItemModalOpen: boolean;
  isItemEntityTab: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
}

export const useItemMasterEntityResources = ({
  activeTab,
  isAddItemModalOpen,
  isItemEntityTab,
  searchInputRef,
}: UseItemMasterEntityResourcesParams) => {
  const activeEntityType = getItemMasterActiveEntityType(activeTab);

  const entityManager = useEntityManager({
    activeEntityType,
    searchInputRef,
  });

  const entityManagementOptions = useMemo(
    () => ({
      entityType: activeEntityType,
      search: entityManager.search,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: isItemEntityTab,
    }),
    [
      activeEntityType,
      entityManager.search,
      entityManager.itemsPerPage,
      isItemEntityTab,
    ]
  );

  const entityData = useEntity(entityManagementOptions);

  useEntity({
    entityType: 'units',
    enabled: activeTab === 'units' || isAddItemModalOpen,
  });

  const { columnDefs: itemColumnDefs } = useItemGridColumns();

  const entityCurrentConfig = useMemo(
    () =>
      isItemEntityTab ? entityManager.entityConfigs[activeEntityType] : null,
    [activeEntityType, entityManager.entityConfigs, isItemEntityTab]
  );

  const entityColumnDefs = useMemo(
    () =>
      isItemEntityTab
        ? buildEntityColumnDefs(activeTab, entityCurrentConfig)
        : [],
    [activeTab, entityCurrentConfig, isItemEntityTab]
  );

  return {
    activeEntityType,
    entityManager,
    entityData,
    itemColumnDefs,
    entityCurrentConfig,
    entityColumnDefs,
  };
};
