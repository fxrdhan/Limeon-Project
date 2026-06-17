import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useSlidingSelectorInteraction } from './useSlidingSelectorInteraction';
import type { SlidingSelectorOption } from './types';

const options: SlidingSelectorOption<string>[] = [
  { defaultLabel: 'Alpha', key: 'alpha', value: 'alpha' },
  { defaultLabel: 'Beta', key: 'beta', value: 'beta' },
];

const renderSlidingSelectorInteraction = ({
  collapseSignal,
  disabled = false,
}: {
  collapseSignal: number;
  disabled?: boolean;
}) =>
  renderHook(
    ({ disabled: isDisabled, signal }) =>
      useSlidingSelectorInteraction({
        activeKey: 'alpha',
        autoCollapseDelay: 300,
        collapseSignal: signal,
        collapsible: true,
        defaultExpanded: false,
        disabled: isDisabled,
        expandDirection: 'horizontal',
        expandOnHover: true,
        onSelectionChange: vi.fn(),
        options,
      }),
    {
      initialProps: { disabled, signal: collapseSignal },
    }
  );

describe('useSlidingSelectorInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      query =>
        ({
          addEventListener: vi.fn(),
          addListener: vi.fn(),
          dispatchEvent: vi.fn(),
          matches: true,
          media: query,
          onchange: null,
          removeEventListener: vi.fn(),
          removeListener: vi.fn(),
        }) as MediaQueryList
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale hover expand timer reopen after a collapse signal', () => {
    const { result, rerender } = renderSlidingSelectorInteraction({
      collapseSignal: 0,
    });

    expect(result.current.isExpanded).toBe(false);

    act(() => {
      result.current.handleMouseEnter();
    });

    rerender({ disabled: false, signal: 1 });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current.isExpanded).toBe(false);
  });

  it('does not let a pending hover expand timer open after disabled changes', () => {
    const { result, rerender } = renderSlidingSelectorInteraction({
      collapseSignal: 0,
    });

    act(() => {
      result.current.handleMouseEnter();
    });

    rerender({ disabled: true, signal: 0 });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current.isExpanded).toBe(false);
  });
});
