import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import PopupMenuContent from '../PopupMenuContent';

describe('PopupMenuContent', () => {
  it('renders default actions with black text for both preselected and regular items', () => {
    render(
      <PopupMenuContent
        actions={[
          {
            label: 'Lihat',
            icon: <span aria-hidden="true">icon</span>,
            onClick: vi.fn(),
          },
          {
            label: 'Unduh',
            icon: <span aria-hidden="true">icon</span>,
            onClick: vi.fn(),
          },
        ]}
        enableArrowNavigation
        autoFocusFirstItem
      />
    );

    expect(screen.getByRole('menuitem', { name: 'Lihat' }).className).toContain(
      'text-black'
    );
    expect(screen.getByRole('menuitem', { name: 'Unduh' }).className).toContain(
      'text-black'
    );
  });
});
