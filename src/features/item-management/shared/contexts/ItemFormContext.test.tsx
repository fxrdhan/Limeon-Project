import { render, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ItemManagementContextValue } from '../types';
import {
  ItemActionStateContext,
  ItemBusinessActionsContext,
  ItemFormActionsContext,
  ItemFormStateContext,
  ItemHistoryStateContext,
  ItemManagementProvider,
  ItemModalActionsContext,
  ItemModalStateContext,
  ItemPriceStateContext,
  ItemProvider,
  ItemRealtimeStateContext,
  ItemUIActionsContext,
  ItemUIStateContext,
} from './ItemFormContext';

const createProviderValue = (
  overrides: Partial<ItemManagementContextValue> = {}
): ItemManagementContextValue =>
  ({
    form: { formKey: 'form-value' },
    ui: { uiKey: 'ui-value' },
    modal: { modalKey: 'modal-value' },
    price: { priceKey: 'price-value' },
    action: { actionKey: 'action-value' },
    realtime: { realtimeKey: 'rt-value' },
    history: { data: null, isLoading: false, error: null },
    formActions: { updateForm: vi.fn() },
    uiActions: { openUI: vi.fn() },
    modalActions: { closeModal: vi.fn() },
    businessActions: { saveItem: vi.fn() },
    ...overrides,
  }) as unknown as ItemManagementContextValue;

const ContextSnapshot = () => {
  const form = useContext(ItemFormStateContext);
  const ui = useContext(ItemUIStateContext);
  const modal = useContext(ItemModalStateContext);
  const price = useContext(ItemPriceStateContext);
  const action = useContext(ItemActionStateContext);
  const realtime = useContext(ItemRealtimeStateContext);
  const history = useContext(ItemHistoryStateContext);
  const formActions = useContext(ItemFormActionsContext);
  const uiActions = useContext(ItemUIActionsContext);
  const modalActions = useContext(ItemModalActionsContext);
  const businessActions = useContext(ItemBusinessActionsContext);

  const values = [
    `form:${(form as { formKey?: string } | undefined)?.formKey ?? 'none'}`,
    `ui:${(ui as { uiKey?: string } | undefined)?.uiKey ?? 'none'}`,
    `modal:${(modal as { modalKey?: string } | undefined)?.modalKey ?? 'none'}`,
    `price:${(price as { priceKey?: string } | undefined)?.priceKey ?? 'none'}`,
    `action:${(action as { actionKey?: string } | undefined)?.actionKey ?? 'none'}`,
    `realtime:${realtime ? 'present' : 'undefined'}`,
    `history:${history ? 'present' : 'undefined'}`,
    `formActions:${formActions ? 'present' : 'undefined'}`,
    `uiActions:${uiActions ? 'present' : 'undefined'}`,
    `modalActions:${modalActions ? 'present' : 'undefined'}`,
    `businessActions:${businessActions ? 'present' : 'undefined'}`,
  ];

  return <div data-testid="snapshot">{values.join('|')}</div>;
};

describe('ItemFormContext provider', () => {
  it('provides all segmented contexts through ItemManagementProvider', () => {
    render(
      <ItemManagementProvider value={createProviderValue()}>
        <ContextSnapshot />
      </ItemManagementProvider>
    );

    const snapshot = screen.getByTestId('snapshot').textContent || '';
    expect(snapshot).toContain('form:form-value');
    expect(snapshot).toContain('ui:ui-value');
    expect(snapshot).toContain('modal:modal-value');
    expect(snapshot).toContain('price:price-value');
    expect(snapshot).toContain('action:action-value');
    expect(snapshot).toContain('realtime:present');
    expect(snapshot).toContain('history:present');
    expect(snapshot).toContain('formActions:present');
    expect(snapshot).toContain('businessActions:present');
  });

  it('supports ItemProvider alias and optional realtime/history undefined', () => {
    render(
      <ItemProvider
        value={createProviderValue({
          realtime: undefined,
          history: undefined,
          form: { formKey: 'alias-form' } as never,
        })}
      >
        <ContextSnapshot />
      </ItemProvider>
    );

    const snapshot = screen.getByTestId('snapshot').textContent || '';
    expect(snapshot).toContain('form:alias-form');
    expect(snapshot).toContain('realtime:undefined');
    expect(snapshot).toContain('history:undefined');
  });
});
