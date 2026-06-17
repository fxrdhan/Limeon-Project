import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import HistoryRestoreDialog from './HistoryRestoreDialog';

describe('HistoryRestoreDialog', () => {
  it('locks restore mode and backdrop cancel while restoring', () => {
    const onCancel = vi.fn();
    const onRestoreModeChange = vi.fn();

    const { container } = render(
      <HistoryRestoreDialog
        isOpen
        targetVersion={3}
        restoreMode="soft"
        isRestoring
        onRestoreModeChange={onRestoreModeChange}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );

    const softRestore = screen.getByRole('radio', { name: 'Soft Restore' });
    const hardRollback = screen.getByRole('radio', { name: 'Hard Rollback' });
    const backdrop = container.querySelector('[aria-hidden="true"]');

    expect(softRestore).toBeInstanceOf(HTMLInputElement);
    expect(hardRollback).toBeInstanceOf(HTMLInputElement);
    expect((softRestore as HTMLInputElement).disabled).toBe(true);
    expect((hardRollback as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(hardRollback);
    if (backdrop instanceof HTMLElement) {
      fireEvent.click(backdrop);
    }

    expect(onRestoreModeChange).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
