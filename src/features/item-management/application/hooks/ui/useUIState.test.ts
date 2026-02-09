import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAddItemUIState } from './useUIState';

describe('useAddItemUIState', () => {
  it('exposes all UI flags and setters', () => {
    const { result } = renderHook(() => useAddItemUIState());

    expect(result.current.isClosing).toBe(false);
    expect(result.current.showDescription).toBe(false);
    expect(result.current.isDescriptionHovered).toBe(false);
    expect(result.current.showFefoTooltip).toBe(false);

    act(() => {
      result.current.setIsClosing(true);
      result.current.setShowDescription(true);
      result.current.setIsDescriptionHovered(true);
      result.current.setShowFefoTooltip(true);
    });

    expect(result.current.isClosing).toBe(true);
    expect(result.current.showDescription).toBe(true);
    expect(result.current.isDescriptionHovered).toBe(true);
    expect(result.current.showFefoTooltip).toBe(true);
  });
});
