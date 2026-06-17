import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useChatReceiptMutationQueue } from '../hooks/useChatReceiptMutationQueue';

interface TestMessage {
  id: string;
}

const createDeferred = <T,>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

describe('useChatReceiptMutationQueue', () => {
  const runMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not let a stale scope completion release pending ids for the active scope', async () => {
    const firstMutation = createDeferred<{
      data: TestMessage[];
      error: null;
    }>();
    const secondMutation = createDeferred<{
      data: TestMessage[];
      error: null;
    }>();
    runMutation
      .mockReturnValueOnce(firstMutation.promise)
      .mockReturnValueOnce(secondMutation.promise);

    const { result, rerender } = renderHook(
      ({ scopeResetKey }: { scopeResetKey: string }) =>
        useChatReceiptMutationQueue<TestMessage>({
          retryDelayMs: 100,
          runMutation,
          scopeResetKey,
        }),
      {
        initialProps: { scopeResetKey: 'conversation-a' },
      }
    );

    let firstSubmit = Promise.resolve();
    act(() => {
      firstSubmit = result.current.submitMessageIds(['message-1'], 1);
    });

    expect(runMutation).toHaveBeenCalledTimes(1);

    rerender({ scopeResetKey: 'conversation-b' });

    let secondSubmit = Promise.resolve();
    act(() => {
      secondSubmit = result.current.submitMessageIds(['message-1'], 2);
    });

    expect(runMutation).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstMutation.resolve({ data: [], error: null });
      await firstSubmit;
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submitMessageIds(['message-1'], 2);
    });

    expect(runMutation).toHaveBeenCalledTimes(2);

    await act(async () => {
      secondMutation.resolve({ data: [], error: null });
      await secondSubmit;
      await Promise.resolve();
    });
  });
});
