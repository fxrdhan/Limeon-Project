import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useComposerLinkPromptPopover } from '../hooks/useComposerLinkPromptPopover';

describe('useComposerLinkPromptPopover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not let a stale close timer dismiss the next link prompt', () => {
    const onDismissAttachmentPastePrompt = vi.fn();

    const { result, rerender } = renderHook(
      ({ linkPromptUrl }: { linkPromptUrl: string | null }) =>
        useComposerLinkPromptPopover({
          linkPromptUrl,
          onDismissAttachmentPastePrompt,
        }),
      {
        initialProps: { linkPromptUrl: 'https://example.com/old' },
      }
    );

    act(() => {
      result.current.scheduleAttachmentPromptClose();
    });

    act(() => {
      rerender({ linkPromptUrl: 'https://example.com/new' });
    });

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(onDismissAttachmentPastePrompt).not.toHaveBeenCalled();

    act(() => {
      result.current.scheduleAttachmentPromptClose();
      vi.advanceTimersByTime(160);
    });

    expect(onDismissAttachmentPastePrompt).toHaveBeenCalledTimes(1);
  });
});
