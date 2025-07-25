// Main component export
export { default as ItemManagementModal } from "./components/ItemManagementModal";

// Context exports
export { ItemManagementProvider } from "./contexts/ItemManagementContext";
export { useItemManagement } from "./contexts/useItemManagementContext";

// Hook exports
export { useAddItemForm } from "./hooks/useItemManagement";
export { useItemFormValidation } from "./hooks/useItemFormValidation";
export { useUnitConversion } from "./hooks/unitConversion";

// Type exports
export type {
  ItemFormData,
  ItemManagementModalProps,
  ItemManagementContextValue,
  UnitConversion,
  FormData, // backward compatibility
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