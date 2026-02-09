import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AlertContext, useAlert } from './hooks';

describe('useAlert', () => {
  it('throws when used outside AlertProvider context', () => {
    expect(() => renderHook(() => useAlert())).toThrow(
      'useAlert harus digunakan di dalam AlertProvider'
    );
  });

  it('maps helper methods to addAlert with matching alert types', () => {
    const addAlert = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AlertContext.Provider
        value={{ alerts: [], addAlert, removeAlert: vi.fn() }}
      >
        {children}
      </AlertContext.Provider>
    );

    const { result } = renderHook(() => useAlert(), { wrapper });

    act(() => {
      result.current.success('ok', { duration: 1000 });
      result.current.error('err');
      result.current.warning('warn', { persistent: true });
      result.current.info('info');
    });

    expect(addAlert).toHaveBeenNthCalledWith(1, 'ok', 'success', {
      duration: 1000,
    });
    expect(addAlert).toHaveBeenNthCalledWith(2, 'err', 'error', undefined);
    expect(addAlert).toHaveBeenNthCalledWith(3, 'warn', 'warning', {
      persistent: true,
    });
    expect(addAlert).toHaveBeenNthCalledWith(4, 'info', 'info', undefined);
  });
});
