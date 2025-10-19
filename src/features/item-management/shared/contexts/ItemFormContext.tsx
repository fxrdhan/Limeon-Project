import React, { createContext, useMemo } from 'react';
import type {
  ItemActionState,
  ItemBusinessActions,
  ItemFormActions,
  ItemFormState,
  ItemManagementProviderProps,
  ItemModalActions,
  ItemModalState,
  ItemPriceState,
  ItemRealtimeState,
  ItemUIActions,
  ItemUIState,
} from '../types';

// eslint-disable-next-line react-refresh/only-export-components
export const ItemFormStateContext = createContext<ItemFormState | undefined>(
  undefined
);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemUIStateContext = createContext<ItemUIState | undefined>(
  undefined
);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemModalStateContext = createContext<ItemModalState | undefined>(
  undefined
);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemPriceStateContext = createContext<ItemPriceState | undefined>(
  undefined
);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemActionStateContext = createContext<
  ItemActionState | undefined
>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemRealtimeStateContext = createContext<
  ItemRealtimeState | undefined
>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemFormActionsContext = createContext<
  ItemFormActions | undefined
>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemUIActionsContext = createContext<ItemUIActions | undefined>(
  undefined
);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemModalActionsContext = createContext<
  ItemModalActions | undefined
>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export const ItemBusinessActionsContext = createContext<
  ItemBusinessActions | undefined
>(undefined);

/**
 * Optimized ItemManagementProvider using composition pattern
 * Eliminates deep nesting by composing providers programmatically
 */
export const ItemManagementProvider: React.FC<ItemManagementProviderProps> = ({
  children,
  value,
}) => {
  // Memoize each context value separately for granular updates
  const memoizedForm = useMemo(() => value.form, [value.form]);
  const memoizedUI = useMemo(() => value.ui, [value.ui]);
  const memoizedModal = useMemo(() => value.modal, [value.modal]);
  const memoizedPrice = useMemo(() => value.price, [value.price]);
  const memoizedAction = useMemo(() => value.action, [value.action]);
  const memoizedRealtime = useMemo(() => value.realtime, [value.realtime]);
  const memoizedFormActions = useMemo(
    () => value.formActions,
    [value.formActions]
  );
  const memoizedUIActions = useMemo(() => value.uiActions, [value.uiActions]);
  const memoizedModalActions = useMemo(
    () => value.modalActions,
    [value.modalActions]
  );
  const memoizedBusinessActions = useMemo(
    () => value.businessActions,
    [value.businessActions]
  );

  // Compose providers in array for better readability and maintainability
  const providers: Array<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Context: React.Context<any>;
    value: unknown;
  }> = [
    { Context: ItemFormStateContext, value: memoizedForm },
    { Context: ItemUIStateContext, value: memoizedUI },
    { Context: ItemModalStateContext, value: memoizedModal },
    { Context: ItemPriceStateContext, value: memoizedPrice },
    { Context: ItemActionStateContext, value: memoizedAction },
    { Context: ItemRealtimeStateContext, value: memoizedRealtime },
    { Context: ItemFormActionsContext, value: memoizedFormActions },
    { Context: ItemUIActionsContext, value: memoizedUIActions },
    { Context: ItemModalActionsContext, value: memoizedModalActions },
    { Context: ItemBusinessActionsContext, value: memoizedBusinessActions },
  ];

  // Reduce providers to eliminate nesting
  return providers.reduceRight(
    (child, { Context, value: contextValue }) => (
      <Context.Provider value={contextValue}>{child}</Context.Provider>
    ),
    children
  ) as React.ReactElement;
};
