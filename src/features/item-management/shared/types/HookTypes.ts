
// Hook Parameter Interfaces
export interface UseItemManagementProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

export type AddItemPageHandlersProps = UseItemManagementProps;


