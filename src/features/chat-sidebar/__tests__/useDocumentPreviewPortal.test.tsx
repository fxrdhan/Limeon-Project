import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useDocumentPreviewPortal } from '../hooks/useDocumentPreviewPortal';

const createDeferredPreview = () => {
  let resolvePreview:
    | ((value: { previewUrl: string; revokeOnClose: boolean }) => void)
    | null = null;
  const promise = new Promise<{
    previewUrl: string;
    revokeOnClose: boolean;
  }>(resolve => {
    resolvePreview = resolve;
  });

  return {
    promise,
    resolvePreview: (value: { previewUrl: string; revokeOnClose: boolean }) => {
      resolvePreview?.(value);
    },
  };
};

describe('useDocumentPreviewPortal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not make a closed document preview visible from a stale open frame', async () => {
    let queuedFrame: FrameRequestCallback | null = null;
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        queuedFrame = callback;
        return 17;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useDocumentPreviewPortal());

    await act(async () => {
      await result.current.openDocumentPreview({
        previewName: 'invoice.pdf',
        resolvePreviewUrl: async () => ({
          previewUrl: 'blob:invoice-preview',
          revokeOnClose: false,
        }),
      });
    });

    expect(requestAnimationFrameSpy).toHaveBeenCalledOnce();
    expect(result.current.previewUrl).toBe('blob:invoice-preview');
    expect(result.current.isPreviewVisible).toBe(false);

    act(() => {
      result.current.closeDocumentPreview();
    });

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(17);

    act(() => {
      queuedFrame?.(0);
    });

    expect(result.current.isPreviewVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.previewUrl).toBeNull();
  });

  it('revokes a document preview resolved after the preview was closed', async () => {
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const deferredPreview = createDeferredPreview();
    const { result } = renderHook(() => useDocumentPreviewPortal());

    let openResult: boolean | undefined;
    const openPromise = result.current
      .openDocumentPreview({
        previewName: 'invoice.pdf',
        resolvePreviewUrl: async () => await deferredPreview.promise,
      })
      .then(resultValue => {
        openResult = resultValue;
      });

    act(() => {
      result.current.closeDocumentPreview();
    });

    await act(async () => {
      deferredPreview.resolvePreview({
        previewUrl: 'blob:late-preview',
        revokeOnClose: true,
      });
      await openPromise;
    });

    expect(openResult).toBe(false);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:late-preview');
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.isPreviewVisible).toBe(false);
  });
});
