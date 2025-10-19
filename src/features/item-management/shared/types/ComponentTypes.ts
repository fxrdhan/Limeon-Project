// Modal Component Props
export interface ItemManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  initialSearchQuery?: string;
  isClosing: boolean;
  setIsClosing: (value: boolean) => void;
  refetchItems?: () => void;
}

// Shorter aliases
export type ItemModalProps = ItemManagementModalProps;

// Form Component Props

// UI Component Props
