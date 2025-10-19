import React, { createContext, useMemo } from 'react';
import type {
  ItemActionState,
  ItemBusinessActions,
  ItemFormActions,
  ItemFormState,
  ItemManagementContextValue,
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

export const ItemManagementProvider: React.FC<ItemManagementProviderProps> = ({
  children,
  value,
}) => {
  // Memoize context value to prevent unnecessary re-renders
  const memoizedValue = useMemo<ItemManagementContextValue>(
    () => value,
    [value]
  );

  return (
    <ItemFormStateContext.Provider value={memoizedValue.form}>
      <ItemUIStateContext.Provider value={memoizedValue.ui}>
        <ItemModalStateContext.Provider value={memoizedValue.modal}>
          <ItemPriceStateContext.Provider value={memoizedValue.price}>
            <ItemActionStateContext.Provider value={memoizedValue.action}>
              <ItemRealtimeStateContext.Provider value={memoizedValue.realtime}>
                <ItemFormActionsContext.Provider
                  value={memoizedValue.formActions}
                >
                  <ItemUIActionsContext.Provider
                    value={memoizedValue.uiActions}
                  >
                    <ItemModalActionsContext.Provider
                      value={memoizedValue.modalActions}
                    >
                      <ItemBusinessActionsContext.Provider
                        value={memoizedValue.businessActions}
                      >
                        {children}
                      </ItemBusinessActionsContext.Provider>
                    </ItemModalActionsContext.Provider>
                  </ItemUIActionsContext.Provider>
                </ItemFormActionsContext.Provider>
              </ItemRealtimeStateContext.Provider>
            </ItemActionStateContext.Provider>
          </ItemPriceStateContext.Provider>
        </ItemModalStateContext.Provider>
      </ItemUIStateContext.Provider>
    </ItemFormStateContext.Provider>
  );
};
