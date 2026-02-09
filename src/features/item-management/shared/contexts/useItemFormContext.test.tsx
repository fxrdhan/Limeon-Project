import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
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
import {
  useItemActions,
  useItemForm,
  useItemHistory,
  useItemModal,
  useItemPrice,
  useItemRealtime,
  useItemUI,
} from './useItemFormContext';

const providerWrapper = ({ children }: { children: React.ReactNode }) => (
  <ItemFormStateContext.Provider value={{ formState: 'F' } as never}>
    <ItemFormActionsContext.Provider
      value={{ setField: () => undefined } as never}
    >
      <ItemUIStateContext.Provider value={{ uiState: 'U' } as never}>
        <ItemUIActionsContext.Provider
          value={{ openModal: () => undefined } as never}
        >
          <ItemModalStateContext.Provider value={{ modalState: 'M' } as never}>
            <ItemModalActionsContext.Provider
              value={{ closeModal: () => undefined } as never}
            >
              <ItemPriceStateContext.Provider
                value={{ priceState: 'P' } as never}
              >
                <ItemActionStateContext.Provider
                  value={{ actionState: 'A' } as never}
                >
                  <ItemBusinessActionsContext.Provider
                    value={{ businessAction: () => undefined } as never}
                  >
                    <ItemRealtimeStateContext.Provider
                      value={{ pending: true } as never}
                    >
                      <ItemHistoryStateContext.Provider
                        value={{
                          data: [],
                          isLoading: false,
                          error: null,
                        }}
                      >
                        {children}
                      </ItemHistoryStateContext.Provider>
                    </ItemRealtimeStateContext.Provider>
                  </ItemBusinessActionsContext.Provider>
                </ItemActionStateContext.Provider>
              </ItemPriceStateContext.Provider>
            </ItemModalActionsContext.Provider>
          </ItemModalStateContext.Provider>
        </ItemUIActionsContext.Provider>
      </ItemUIStateContext.Provider>
    </ItemFormActionsContext.Provider>
  </ItemFormStateContext.Provider>
);

describe('useItemFormContext hooks', () => {
  it('throws for protected hooks when used outside provider', () => {
    expect(() => renderHook(() => useItemForm())).toThrow(
      /must be used within ItemManagementProvider/
    );
    expect(() => renderHook(() => useItemUI())).toThrow(
      /must be used within ItemManagementProvider/
    );
    expect(() => renderHook(() => useItemModal())).toThrow(
      /must be used within ItemManagementProvider/
    );
    expect(() => renderHook(() => useItemPrice())).toThrow(
      /must be used within ItemManagementProvider/
    );
    expect(() => renderHook(() => useItemActions())).toThrow(
      /must be used within ItemManagementProvider/
    );
  });

  it('returns merged/typed data when providers are present', () => {
    const form = renderHook(() => useItemForm(), { wrapper: providerWrapper });
    const ui = renderHook(() => useItemUI(), { wrapper: providerWrapper });
    const modal = renderHook(() => useItemModal(), {
      wrapper: providerWrapper,
    });
    const price = renderHook(() => useItemPrice(), {
      wrapper: providerWrapper,
    });
    const actions = renderHook(() => useItemActions(), {
      wrapper: providerWrapper,
    });
    const realtime = renderHook(() => useItemRealtime(), {
      wrapper: providerWrapper,
    });
    const history = renderHook(() => useItemHistory(), {
      wrapper: providerWrapper,
    });

    expect(form.result.current).toMatchObject({ formState: 'F' });
    expect(ui.result.current).toMatchObject({ uiState: 'U' });
    expect(modal.result.current).toMatchObject({ modalState: 'M' });
    expect(price.result.current).toMatchObject({ priceState: 'P' });
    expect(actions.result.current).toMatchObject({ actionState: 'A' });
    expect(realtime.result.current).toMatchObject({ pending: true });
    expect(history.result.current).toMatchObject({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('returns undefined for optional realtime/history hooks without provider', () => {
    expect(renderHook(() => useItemRealtime()).result.current).toBeUndefined();
    expect(renderHook(() => useItemHistory()).result.current).toBeUndefined();
  });
});
