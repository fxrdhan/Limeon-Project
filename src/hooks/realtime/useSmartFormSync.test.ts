import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSmartFormSync } from './useSmartFormSync';

describe('useSmartFormSync', () => {
  it('applies safe updates immediately and defers active-field updates', () => {
    const onDataUpdate = vi.fn();

    const { result } = renderHook(() =>
      useSmartFormSync({
        onDataUpdate,
      })
    );

    const nameHandlers = result.current.getFieldHandlers('name');

    act(() => {
      nameHandlers.onFocus();
    });

    let updateResult:
      | {
          appliedImmediately: Record<string, unknown>;
          pendingConflicts: string[];
        }
      | undefined;

    act(() => {
      updateResult = result.current.handleRealtimeUpdate({
        name: 'Nama Server',
        code: 'KAT-01',
      });
    });

    expect(updateResult).toEqual({
      appliedImmediately: { code: 'KAT-01' },
      pendingConflicts: ['name'],
    });
    expect(onDataUpdate).toHaveBeenCalledWith({ code: 'KAT-01' });
    expect(result.current.hasPendingUpdate('name')).toBe(true);

    act(() => {
      nameHandlers.onBlur();
    });

    expect(onDataUpdate).toHaveBeenCalledWith({ name: 'Nama Server' });
    expect(result.current.hasPendingUpdate('name')).toBe(false);
  });

  it('keeps field active on change and can force-apply all pending updates', () => {
    const onDataUpdate = vi.fn();

    const { result } = renderHook(() =>
      useSmartFormSync({
        onDataUpdate,
        showConflictNotification: false,
      })
    );

    const codeHandlers = result.current.getFieldHandlers('code');
    const nameHandlers = result.current.getFieldHandlers('name');

    act(() => {
      codeHandlers.onChange();
      nameHandlers.onFocus();
      result.current.handleRealtimeUpdate({
        code: 'NEW-CODE',
        name: 'Nama Baru',
        description: 'sinkron',
      });
    });

    expect(onDataUpdate).toHaveBeenCalledWith({ description: 'sinkron' });
    expect(result.current.hasPendingUpdate('code')).toBe(true);
    expect(result.current.hasPendingUpdate('name')).toBe(true);

    let applied: Record<string, unknown> | undefined;
    act(() => {
      applied = result.current.applyAllPendingUpdates();
    });

    expect(applied).toEqual({
      code: 'NEW-CODE',
      name: 'Nama Baru',
    });
    expect(onDataUpdate).toHaveBeenCalledWith({
      code: 'NEW-CODE',
      name: 'Nama Baru',
    });
    expect(result.current.hasPendingUpdate('code')).toBe(false);
    expect(result.current.hasPendingUpdate('name')).toBe(false);
  });

  it('uses latest onDataUpdate callback after rerender', () => {
    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();

    const { result, rerender } = renderHook(
      ({
        callback,
      }: {
        callback: (updates: Record<string, unknown>) => void;
      }) => useSmartFormSync({ onDataUpdate: callback }),
      {
        initialProps: { callback: firstUpdate },
      }
    );

    rerender({ callback: secondUpdate });

    act(() => {
      result.current.handleRealtimeUpdate({ code: 'AFTER-RERENDER' });
    });

    expect(firstUpdate).not.toHaveBeenCalled();
    expect(secondUpdate).toHaveBeenCalledWith({ code: 'AFTER-RERENDER' });
  });

  it('returns empty payload when no pending updates exist', () => {
    const onDataUpdate = vi.fn();
    const { result } = renderHook(() =>
      useSmartFormSync({
        onDataUpdate,
      })
    );

    let applied: Record<string, unknown> | undefined;
    act(() => {
      result.current.unregisterActiveField('unknown');
      applied = result.current.applyAllPendingUpdates();
    });

    expect(applied).toEqual({});
    expect(onDataUpdate).not.toHaveBeenCalled();
  });
});
