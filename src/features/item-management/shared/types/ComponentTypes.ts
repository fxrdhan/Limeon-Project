import type { Item } from '@/types/database';

// Modal Component Props
export interface ItemManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  initialItemData?: Item;
  initialSearchQuery?: string;
  isClosing: boolean;
  setIsClosing: (value: boolean) => void;
  refetchItems?: () => void;
}

// Shorter aliases
export type ItemModalProps = ItemManagementModalProps;

// Form Component Props

// UI Component Props
