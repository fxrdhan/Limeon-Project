import { createContext } from 'react';
import type {
  ItemActionState,
  ItemBusinessActions,
  ItemFormActions,
  ItemFormState,
  ItemManagementContextValue,
  ItemModalActions,
  ItemModalState,
  ItemPriceState,
  ItemRealtimeState,
  ItemUIActions,
  ItemUIState,
} from '../types';

export type ItemHistoryState = ItemManagementContextValue['history'];

export const ItemFormStateContext = createContext<ItemFormState | undefined>(
  undefined
);
export const ItemUIStateContext = createContext<ItemUIState | undefined>(
  undefined
);
export const ItemModalStateContext = createContext<ItemModalState | undefined>(
  undefined
);
export const ItemPriceStateContext = createContext<ItemPriceState | undefined>(
  undefined
);
export const ItemActionStateContext = createContext<
  ItemActionState | undefined
>(undefined);
export const ItemRealtimeStateContext = createContext<
  ItemRealtimeState | undefined
>(undefined);
export const ItemHistoryStateContext = createContext<
  ItemHistoryState | undefined
>(undefined);
export const ItemFormActionsContext = createContext<
  ItemFormActions | undefined
>(undefined);
export const ItemUIActionsContext = createContext<ItemUIActions | undefined>(
  undefined
);
export const ItemModalActionsContext = createContext<
  ItemModalActions | undefined
>(undefined);
export const ItemBusinessActionsContext = createContext<
  ItemBusinessActions | undefined
>(undefined);
