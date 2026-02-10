import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllColumnVisibilityStates,
  getColumnVisibilityState,
  useColumnState,
} from './useColumnState';

describe('useColumnState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('loads initial state from localStorage and handles corrupted JSON', () => {
    localStorage.setItem(
      'pharmasys_entity_column_visibility_items',
      JSON.stringify({ hiddenColIds: ['price', 'stock'] })
    );
    localStorage.setItem(
      'pharmasys_entity_column_visibility_categories',
      '{broken'
    );

    const { result } = renderHook(() =>
      useColumnState({ tableType: 'items', enabled: true })
    );

    expect(result.current.initialState).toEqual({
      columnVisibility: { hiddenColIds: ['price', 'stock'] },
    });

    renderHook(() =>
      useColumnState({ tableType: 'categories', enabled: true })
    );
    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_categories')
    ).toBeNull();
  });

  it('saves state on updates and grid pre-destroy, and supports clear/get key', () => {
    const { result } = renderHook(() =>
      useColumnState({ tableType: 'items', enabled: true })
    );

    act(() => {
      result.current.onStateUpdated({
        state: {
          columnVisibility: {
            hiddenColIds: ['col-a', 'col-b'],
          },
        },
      } as never);
    });

    act(() => {
      vi.advanceTimersByTime(301);
    });

    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_items')
    ).toBe(JSON.stringify({ hiddenColIds: ['col-a', 'col-b'] }));

    act(() => {
      result.current.onGridPreDestroyed({
        state: {
          columnVisibility: {
            hiddenColIds: ['col-c'],
          },
        },
      } as never);
    });

    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_items')
    ).toBe(JSON.stringify({ hiddenColIds: ['col-c'] }));

    expect(result.current.getStorageKey()).toBe(
      'pharmasys_entity_column_visibility_items'
    );

    act(() => {
      result.current.clearState();
    });
    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_items')
    ).toBeNull();
  });

  it('ignores state updates without columnVisibility payload', () => {
    const { result } = renderHook(() =>
      useColumnState({ tableType: 'items', enabled: true })
    );

    act(() => {
      result.current.onStateUpdated({ state: {} } as never);
      result.current.onGridPreDestroyed({ state: {} } as never);
      vi.advanceTimersByTime(500);
    });

    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_items')
    ).toBeNull();
  });

  it('skips persistence when disabled and supports helper utilities', () => {
    const { result } = renderHook(() =>
      useColumnState({ tableType: 'types', enabled: false })
    );

    expect(result.current.initialState).toBeUndefined();

    act(() => {
      result.current.onStateUpdated({
        state: {
          columnVisibility: {
            hiddenColIds: ['col-a'],
          },
        },
      } as never);
      result.current.onGridPreDestroyed({
        state: {
          columnVisibility: {
            hiddenColIds: ['col-b'],
          },
        },
      } as never);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_types')
    ).toBeNull();

    localStorage.setItem(
      'pharmasys_entity_column_visibility_manufacturers',
      JSON.stringify({ hiddenColIds: ['name'] })
    );
    expect(getColumnVisibilityState('manufacturers')).toEqual({
      hiddenColIds: ['name'],
    });

    localStorage.setItem('pharmasys_entity_column_visibility_items', '{}');
    localStorage.setItem('pharmasys_entity_column_visibility_units', '{}');
    clearAllColumnVisibilityStates();

    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_items')
    ).toBeNull();
    expect(
      localStorage.getItem('pharmasys_entity_column_visibility_units')
    ).toBeNull();
  });
});
