export const CACHE_KEY = "addItemFormCache";

export const DEFAULT_MIN_STOCK = 10;

export const ITEM_FORM_STATES = {
  LOADING: "loading",
  SAVING: "saving",
  IDLE: "idle",
} as const;

export const ITEM_MODAL_TYPES = {
  ADD_CATEGORY: "addCategory",
  ADD_TYPE: "addType",
  ADD_UNIT: "addUnit",
} as const;