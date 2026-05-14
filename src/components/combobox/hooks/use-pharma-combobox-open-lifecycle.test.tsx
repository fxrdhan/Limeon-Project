import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { usePharmaComboboxOpenLifecycle } from './use-pharma-combobox-open-lifecycle';

function OpenLifecycleProbe({
  actualOpen,
  revision,
  onOpenReset,
  onCloseReset,
  onFocusRestore,
  onFocusRestoreClear,
}: {
  actualOpen: boolean;
  revision: number;
  onOpenReset: (revision: number) => void;
  onCloseReset: (revision: number) => void;
  onFocusRestore: (revision: number) => void;
  onFocusRestoreClear: (revision: number) => void;
}) {
  usePharmaComboboxOpenLifecycle({
    actualOpen,
    clearFocusRestoreIntent: () => onFocusRestoreClear(revision),
    resetOnClose: () => onCloseReset(revision),
    resetOnOpen: () => onOpenReset(revision),
    restoreFocusAfterCloseIfNeeded: () => onFocusRestore(revision),
  });

  return null;
}

describe('usePharmaComboboxOpenLifecycle', () => {
  it('runs close cleanup only when open state transitions to closed', () => {
    const onOpenReset = vi.fn();
    const onCloseReset = vi.fn();
    const onFocusRestore = vi.fn();
    const onFocusRestoreClear = vi.fn();
    const { rerender } = render(
      <OpenLifecycleProbe
        actualOpen={false}
        revision={0}
        onOpenReset={onOpenReset}
        onCloseReset={onCloseReset}
        onFocusRestore={onFocusRestore}
        onFocusRestoreClear={onFocusRestoreClear}
      />
    );

    rerender(
      <OpenLifecycleProbe
        actualOpen={false}
        revision={1}
        onOpenReset={onOpenReset}
        onCloseReset={onCloseReset}
        onFocusRestore={onFocusRestore}
        onFocusRestoreClear={onFocusRestoreClear}
      />
    );

    expect(onCloseReset).not.toHaveBeenCalled();
    expect(onFocusRestore).not.toHaveBeenCalled();

    rerender(
      <OpenLifecycleProbe
        actualOpen
        revision={2}
        onOpenReset={onOpenReset}
        onCloseReset={onCloseReset}
        onFocusRestore={onFocusRestore}
        onFocusRestoreClear={onFocusRestoreClear}
      />
    );
    rerender(
      <OpenLifecycleProbe
        actualOpen={false}
        revision={3}
        onOpenReset={onOpenReset}
        onCloseReset={onCloseReset}
        onFocusRestore={onFocusRestore}
        onFocusRestoreClear={onFocusRestoreClear}
      />
    );

    expect(onFocusRestoreClear).toHaveBeenCalledOnce();
    expect(onOpenReset).toHaveBeenCalledWith(2);
    expect(onCloseReset).toHaveBeenCalledOnce();
    expect(onCloseReset).toHaveBeenCalledWith(3);
    expect(onFocusRestore).toHaveBeenCalledOnce();
    expect(onFocusRestore).toHaveBeenCalledWith(3);
  });
});
