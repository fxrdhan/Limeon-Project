import { describe, expect, it } from 'vite-plus/test';
import { getAdjacentItemMasterSwitcherTab } from './itemMasterTabNavigationState';

describe('item master tab navigation state', () => {
  it('derives next switcher tab with wraparound', () => {
    expect(getAdjacentItemMasterSwitcherTab('items', 'next').value).toBe(
      'categories'
    );
    expect(getAdjacentItemMasterSwitcherTab('units', 'next').value).toBe(
      'items'
    );
  });

  it('derives previous switcher tab with wraparound', () => {
    expect(getAdjacentItemMasterSwitcherTab('items', 'previous').value).toBe(
      'units'
    );
    expect(
      getAdjacentItemMasterSwitcherTab('categories', 'previous').value
    ).toBe('items');
  });

  it('keeps existing fallback behavior for tabs outside the switcher', () => {
    expect(getAdjacentItemMasterSwitcherTab('suppliers', 'next').value).toBe(
      'categories'
    );
    expect(
      getAdjacentItemMasterSwitcherTab('suppliers', 'previous').value
    ).toBe('units');
  });
});
