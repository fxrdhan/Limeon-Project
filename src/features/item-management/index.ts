// BACKWARD COMPATIBILITY - Keep old interface while having new structure underneath

// Main component exports (compatibility)
export { default as ItemManagementModal } from "./presentation/templates/item/ItemManagementModal";
export { EntityManagementModal } from "./presentation/templates/entity";

// Component exports for external usage
export { ItemDataTable } from "./presentation/organisms";
export { useItemGridColumns } from "./application/hooks/ui";

// Atomic design components available for optional usage

// Context exports
export { ItemManagementProvider } from "./shared/contexts/ItemFormContext";
export { useItemManagement } from "./shared/contexts/useItemFormContext";
export { EntityModalProvider, useEntityModal } from "./shared/contexts/EntityModalContext";

// Hook exports (backward compatible)
export { useAddItemForm } from "./application/hooks/core/useItemCrud";
export { useItemFormValidation } from "./application/hooks/form/useItemValidation";
export { useUnitConversion } from "./application/hooks/utils/useUnitConversion";
export { useEntityModalLogic } from "./application/hooks/entity/useEntityModalLogic";

// Type exports
export type {
  ItemFormData,
  ItemManagementModalProps,
  ItemManagementContextValue,
  UnitConversion,
} from "./shared/types";

// Utility exports (backward compatible)
// Item code generation functions removed - migrated to edge function
// Use /supabase/edge-functions/generate-item-code/ instead
export {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
} from "./shared/utils/PriceCalculator";

// Constants
export { CACHE_KEY, DEFAULT_MIN_STOCK } from "./constants";