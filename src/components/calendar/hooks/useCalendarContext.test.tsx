import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { CalendarContext } from '../providers/calendarContext';
import type { CalendarContextState } from '../types';
import { useCalendarContext } from './useCalendarContext';

describe('useCalendarContext', () => {
  it('returns context value when used inside provider', () => {
    const contextValue = { value: null } as unknown as CalendarContextState;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CalendarContext.Provider value={contextValue}>
        {children}
      </CalendarContext.Provider>
    );

    const { result } = renderHook(() => useCalendarContext(), { wrapper });

    expect(result.current).toBe(contextValue);
  });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useCalendarContext())).toThrow(
      'useCalendarContext must be used within a CalendarProvider'
    );
  });
});
