// Main component export
export { default as ItemManagementModal } from "./components/ItemManagementModal";

// Entity component exports
export { EntityManagementModal } from "./components/modals";

// Context exports
export { ItemManagementProvider } from "./contexts/ItemManagementContext";
export { useItemManagement } from "./contexts/useItemManagementContext";
export { EntityModalProvider, useEntityModal } from "./contexts/EntityModalContext";

// Hook exports
export { useAddItemForm } from "./hooks/useItemManagement";
export { useItemFormValidation } from "./hooks/useItemFormValidation";
export { useUnitConversion } from "./hooks/unitConversion";
export { useEntityModalLogic } from "./hooks/useEntityModalLogic";

// Type exports
export type {
  ItemFormData,
  ItemManagementModalProps,
  ItemManagementContextValue,
  UnitConversion,
} from "./types";

// Utility exports
export {
  generateTypeCode,
  generateUnitCode,
  generateCategoryCode,
} from "./utils/itemCodeGeneration";
export {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
} from "./utils/priceCalculations";

// Constant exports
export { CACHE_KEY, DEFAULT_MIN_STOCK } from "./constants";