import { useContext } from 'react';
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
} from './ItemFormContext';

const ensureContext = <T>(context: T | undefined, name: string): T => {
  if (!context) {
    throw new Error(`${name} must be used within ItemManagementProvider`);
  }
  return context;
};

// Specialized hooks for focused access (performance optimization)
export const useItemForm = () => {
  const state = ensureContext(useContext(ItemFormStateContext), 'useItemForm');
  const actions = ensureContext(
    useContext(ItemFormActionsContext),
    'useItemForm'
  );
  return { ...state, ...actions };
};

export const useItemUI = () => {
  const state = ensureContext(useContext(ItemUIStateContext), 'useItemUI');
  const actions = ensureContext(useContext(ItemUIActionsContext), 'useItemUI');
  return { ...state, ...actions };
};

export const useItemModal = () => {
  const state = ensureContext(
    useContext(ItemModalStateContext),
    'useItemModal'
  );
  const actions = ensureContext(
    useContext(ItemModalActionsContext),
    'useItemModal'
  );
  return { ...state, ...actions };
};

export const useItemPrice = () => {
  return ensureContext(useContext(ItemPriceStateContext), 'useItemPrice');
};

export const useItemActions = () => {
  const actionState = ensureContext(
    useContext(ItemActionStateContext),
    'useItemActions'
  );
  const businessActions = ensureContext(
    useContext(ItemBusinessActionsContext),
    'useItemActions'
  );
  return { ...actionState, ...businessActions };
};

export const useItemRealtime = () => {
  return useContext(ItemRealtimeStateContext);
};

export const useItemHistory = () => {
  return useContext(ItemHistoryStateContext);
};
