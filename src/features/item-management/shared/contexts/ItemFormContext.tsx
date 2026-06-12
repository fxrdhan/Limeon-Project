import React, { useMemo } from 'react';
import type { ItemManagementProviderProps } from '../types';
import {
  ItemActionStateContext,
  ItemBusinessActionsContext,
  ItemFormActionsContext,
  ItemFormStateContext,
  ItemHistoryStateContext,
  ItemModalActionsContext,
  ItemModalStateContext,
  ItemPriceStateContext,
  ItemRealtimeStateContext,
  ItemUIActionsContext,
  ItemUIStateContext,
} from './ItemFormContexts';

/**
 * ItemProvider - Composition pattern for context management
 * Provides all item-related state and actions through separate contexts
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
  const memoizedHistory = useMemo(() => value.history, [value.history]);
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

  return (
    <ItemFormStateContext.Provider value={memoizedForm}>
      <ItemUIStateContext.Provider value={memoizedUI}>
        <ItemModalStateContext.Provider value={memoizedModal}>
          <ItemPriceStateContext.Provider value={memoizedPrice}>
            <ItemActionStateContext.Provider value={memoizedAction}>
              <ItemRealtimeStateContext.Provider value={memoizedRealtime}>
                <ItemHistoryStateContext.Provider value={memoizedHistory}>
                  <ItemFormActionsContext.Provider value={memoizedFormActions}>
                    <ItemUIActionsContext.Provider value={memoizedUIActions}>
                      <ItemModalActionsContext.Provider
                        value={memoizedModalActions}
                      >
                        <ItemBusinessActionsContext.Provider
                          value={memoizedBusinessActions}
                        >
                          {children}
                        </ItemBusinessActionsContext.Provider>
                      </ItemModalActionsContext.Provider>
                    </ItemUIActionsContext.Provider>
                  </ItemFormActionsContext.Provider>
                </ItemHistoryStateContext.Provider>
              </ItemRealtimeStateContext.Provider>
            </ItemActionStateContext.Provider>
          </ItemPriceStateContext.Provider>
        </ItemModalStateContext.Provider>
      </ItemUIStateContext.Provider>
    </ItemFormStateContext.Provider>
  );
};

// Shorter alias
export const ItemProvider = ItemManagementProvider;
