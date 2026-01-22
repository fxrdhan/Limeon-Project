import type { Item } from '@/types/database';

// Hook Parameter Interfaces
export interface UseItemManagementProps {
  itemId?: string;
  initialItemData?: Item;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

export type AddItemPageHandlersProps = UseItemManagementProps;
