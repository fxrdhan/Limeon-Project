import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { EntityData, VersionData } from '../../../shared/types';
import { useEntityModalLogic } from './useEntityModalLogic';

type RealtimeProps = {
  onEntityDeleted?: () => void;
};

const realtimeMockState = vi.hoisted(
  (): { latestProps: RealtimeProps | null } => ({
    latestProps: null,
  })
);

vi.mock('./useEntityModalRealtime', () => ({
  useEntityModalRealtime: (props: RealtimeProps) => {
    realtimeMockState.latestProps = props;
    return { smartFormSync: {} };
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

const initialData: EntityData = {
  id: 'entity-a',
  code: 'ENT-A',
  name: 'Entity A',
  description: 'Description A',
  address: 'Address A',
};

const versionA: VersionData = {
  action_type: 'UPDATE',
  changed_at: '2026-06-16T00:00:00.000Z',
  entity_data: { name: 'Version A' },
  id: 'version-a',
  version_number: 1,
};

const versionB: VersionData = {
  action_type: 'UPDATE',
  changed_at: '2026-06-16T00:01:00.000Z',
  entity_data: { name: 'Version B' },
  id: 'version-b',
  version_number: 2,
};

const createProps = (onClose = vi.fn()) => ({
  entityName: 'Kategori',
  initialData,
  isOpen: true,
  onClose,
  onSubmit: vi.fn().mockResolvedValue(undefined),
});

const createDeferred = <T>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
    reject: (reason?: unknown) => {
      rejectPromise?.(reason);
    },
  };
};

const flushInitialization = () => {
  act(() => {
    vi.advanceTimersByTime(0);
  });
};

describe('useEntityModalLogic', () => {
  beforeEach(() => {
    realtimeMockState.latestProps = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale comparison close timer close a reopened comparison flow', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useEntityModalLogic(createProps(onClose))
    );

    act(() => {
      result.current.contextValue.uiActions.openComparison(versionA);
    });
    act(() => {
      result.current.contextValue.uiActions.handleClose();
    });
    act(() => {
      result.current.contextValue.uiActions.openComparison(versionB);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.contextValue.ui.isClosing).toBe(false);
    expect(result.current.contextValue.comparison.isOpen).toBe(true);
    expect(result.current.contextValue.comparison.selectedVersion).toBe(
      versionB
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears a pending comparison close timer when the modal session reopens', () => {
    const onClose = vi.fn();
    const firstProps = createProps(onClose);
    const secondProps = {
      ...createProps(onClose),
      initialData: {
        ...initialData,
        id: 'entity-b',
        code: 'ENT-B',
        name: 'Entity B',
      },
    };
    const { result, rerender } = renderHook(
      props => useEntityModalLogic(props),
      { initialProps: firstProps }
    );
    flushInitialization();

    act(() => {
      result.current.contextValue.uiActions.openComparison(versionA);
      result.current.contextValue.uiActions.handleClose();
    });

    rerender({
      ...firstProps,
      isOpen: false,
    });
    rerender(secondProps);
    flushInitialization();
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.contextValue.ui.isClosing).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not run a delayed realtime deletion close after unmount', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() =>
      useEntityModalLogic(createProps(onClose))
    );

    act(() => {
      realtimeMockState.latestProps?.onEntityDeleted?.();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores duplicate submit clicks while the first submit is pending', async () => {
    const submit = createDeferred<void>();
    const onSubmit = vi.fn().mockReturnValue(submit.promise);
    const { result } = renderHook(() =>
      useEntityModalLogic({
        ...createProps(),
        onSubmit,
      })
    );
    flushInitialization();

    let firstSubmit: Promise<void> = Promise.resolve();
    let secondSubmit: Promise<void> = Promise.resolve();
    act(() => {
      firstSubmit = result.current.contextValue.formActions.handleSubmit();
      secondSubmit = result.current.contextValue.formActions.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledOnce();

    await act(async () => {
      submit.resolve();
      await firstSubmit;
      await secondSubmit;
    });

    expect(result.current.contextValue.ui.isClosing).toBe(true);
  });

  it('does not let a stale failed submit clear loading for a newer modal session', async () => {
    const staleSubmit = createDeferred<void>();
    const currentSubmit = createDeferred<void>();
    const onStaleSubmit = vi.fn().mockReturnValue(staleSubmit.promise);
    const onCurrentSubmit = vi.fn().mockReturnValue(currentSubmit.promise);
    const firstProps = {
      ...createProps(),
      onSubmit: onStaleSubmit,
    };
    const secondProps = {
      ...createProps(),
      initialData: {
        ...initialData,
        id: 'entity-b',
        code: 'ENT-B',
        name: 'Entity B',
      },
      onSubmit: onCurrentSubmit,
    };
    const { result, rerender } = renderHook(
      props => useEntityModalLogic(props),
      { initialProps: firstProps }
    );
    flushInitialization();

    let staleSubmitPromise: Promise<void> = Promise.resolve();
    act(() => {
      staleSubmitPromise =
        result.current.contextValue.formActions.handleSubmit();
    });

    rerender({
      ...firstProps,
      isOpen: false,
    });
    rerender(secondProps);
    flushInitialization();

    act(() => {
      void result.current.contextValue.formActions.handleSubmit();
    });
    expect(onCurrentSubmit).toHaveBeenCalledOnce();
    expect(result.current.contextValue.action.isLoading).toBe(true);

    await act(async () => {
      staleSubmit.reject(new Error('stale submit'));
      await staleSubmitPromise;
    });

    expect(result.current.contextValue.action.isLoading).toBe(true);

    await act(async () => {
      currentSubmit.resolve();
      await currentSubmit.promise;
    });
  });

  it('does not let a stale successful submit close a reopened modal session', async () => {
    const staleSubmit = createDeferred<void>();
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockReturnValue(staleSubmit.promise);
    const firstProps = {
      ...createProps(onClose),
      onSubmit,
    };
    const secondProps = {
      ...createProps(onClose),
      initialData: {
        ...initialData,
        id: 'entity-c',
        code: 'ENT-C',
        name: 'Entity C',
      },
      onSubmit: vi.fn().mockResolvedValue(undefined),
    };
    const { result, rerender } = renderHook(
      props => useEntityModalLogic(props),
      { initialProps: firstProps }
    );
    flushInitialization();

    let staleSubmitPromise: Promise<void> = Promise.resolve();
    act(() => {
      staleSubmitPromise =
        result.current.contextValue.formActions.handleSubmit();
    });

    rerender({
      ...firstProps,
      isOpen: false,
    });
    rerender(secondProps);
    flushInitialization();

    await act(async () => {
      staleSubmit.resolve();
      await staleSubmitPromise;
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.contextValue.ui.isClosing).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores duplicate delete clicks while the first delete is pending', async () => {
    const deletion = createDeferred<void>();
    const onDelete = vi.fn().mockReturnValue(deletion.promise);
    const { result } = renderHook(() =>
      useEntityModalLogic({
        ...createProps(),
        onDelete,
      })
    );

    act(() => {
      result.current.contextValue.formActions.handleDelete();
      result.current.contextValue.formActions.handleDelete();
    });

    expect(onDelete).toHaveBeenCalledOnce();

    await act(async () => {
      deletion.resolve();
      await deletion.promise;
      await Promise.resolve();
    });

    expect(result.current.contextValue.ui.isClosing).toBe(true);
  });
});
