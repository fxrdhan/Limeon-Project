import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ItemMasterRedirect from './ItemMasterRedirect';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
    navigateMock({ to, replace });
    return <div data-testid="item-master-redirect" />;
  },
}));

describe('ItemMasterRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to last valid tab from session storage', () => {
    sessionStorage.setItem('item_master_last_tab', 'manufacturers');

    render(<ItemMasterRedirect />);

    expect(screen.getByTestId('item-master-redirect')).toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/master-data/item-master/manufacturers',
      replace: true,
    });
  });

  it('falls back to items when tab is missing or invalid', () => {
    sessionStorage.setItem('item_master_last_tab', 'unknown-tab');

    render(<ItemMasterRedirect />);

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/master-data/item-master/items',
      replace: true,
    });
  });

  it('falls back to items when session access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('session blocked');
    });

    render(<ItemMasterRedirect />);

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/master-data/item-master/items',
      replace: true,
    });
  });
});
