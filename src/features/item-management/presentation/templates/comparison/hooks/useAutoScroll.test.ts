import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoScroll } from './useAutoScroll';

const buildRefs = () => {
  const kode = document.createElement('div');
  const name = document.createElement('div');
  const description = document.createElement('div');

  return {
    kodeRef: { current: kode } as React.RefObject<HTMLDivElement | null>,
    nameRef: { current: name } as React.RefObject<HTMLDivElement | null>,
    descriptionRef: {
      current: description,
    } as React.RefObject<HTMLDivElement | null>,
  };
};

describe('useAutoScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-scrolls to first highlighted description when diff exists', () => {
    const refs = buildRefs();
    const highlight = document.createElement('span');
    highlight.className = 'bg-green-400';
    const scrollIntoViewMock = vi.fn();
    highlight.scrollIntoView = scrollIntoViewMock;
    refs.descriptionRef.current?.appendChild(highlight);

    renderHook(() =>
      useAutoScroll({
        isOpen: true,
        compData: { isDescriptionDifferent: true },
        ...refs,
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  });

  it('skips auto-scroll while user is actively scrolling', () => {
    const refs = buildRefs();
    const highlight = document.createElement('span');
    highlight.className = 'bg-red-400';
    const scrollIntoViewMock = vi.fn();
    highlight.scrollIntoView = scrollIntoViewMock;
    refs.descriptionRef.current?.appendChild(highlight);

    renderHook(() =>
      useAutoScroll({
        isOpen: true,
        compData: { isDescriptionDifferent: true },
        ...refs,
      })
    );

    act(() => {
      refs.descriptionRef.current?.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(700);
    });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('retries until highlighted element appears', () => {
    const refs = buildRefs();
    const scrollIntoViewMock = vi.fn();

    renderHook(() =>
      useAutoScroll({
        isOpen: true,
        compData: { isDescriptionDifferent: true },
        ...refs,
      })
    );

    act(() => {
      vi.advanceTimersByTime(700);
      const lateHighlight = document.createElement('span');
      lateHighlight.className = 'bg-green-400';
      lateHighlight.scrollIntoView = scrollIntoViewMock;
      refs.descriptionRef.current?.appendChild(lateHighlight);
      vi.advanceTimersByTime(500);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });
});
