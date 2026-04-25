import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import PopupMenuContent from './PopupMenuContent';

describe('PopupMenuContent', () => {
  it('runs the preselected action when Enter is pressed', () => {
    const viewAction = vi.fn();

    render(
      <PopupMenuContent
        actions={[
          {
            label: 'Lihat',
            icon: null,
            onClick: viewAction,
          },
          {
            label: 'Salin',
            icon: null,
            onClick: vi.fn(),
          },
        ]}
        enableArrowNavigation
        autoFocusFirstItem
      />
    );

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Lihat' }), {
      key: 'Enter',
    });

    expect(viewAction).toHaveBeenCalledTimes(1);
  });

  it('runs the selected action when Enter is pressed after arrow navigation', () => {
    const viewAction = vi.fn();
    const copyAction = vi.fn();

    render(
      <PopupMenuContent
        actions={[
          {
            label: 'Lihat',
            icon: null,
            onClick: viewAction,
          },
          {
            label: 'Salin',
            icon: null,
            onClick: copyAction,
          },
        ]}
        enableArrowNavigation
        autoFocusFirstItem
      />
    );

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Lihat' }), {
      key: 'ArrowDown',
    });
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Salin' }), {
      key: 'Enter',
    });

    expect(copyAction).toHaveBeenCalledTimes(1);
    expect(viewAction).not.toHaveBeenCalled();
  });
});
