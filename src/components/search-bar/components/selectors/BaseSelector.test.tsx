import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import BaseSelector from './BaseSelector';
import type { BaseSelectorConfig } from '../../types';

type SelectorItem = {
  id: string;
  label: string;
};

const createConfig = (
  headerText: string
): BaseSelectorConfig<SelectorItem> => ({
  footerSingular: 'item',
  getItemIcon: item => <span aria-hidden="true">{item.label.charAt(0)}</span>,
  getItemKey: item => item.id,
  getItemLabel: item => item.label,
  getSearchFields: item => [{ key: 'label', value: item.label, boost: 1000 }],
  headerText,
  maxHeight: '320px',
  noResultsText: "'{searchTerm}' tidak ditemukan",
});

describe('BaseSelector remount behavior', () => {
  it('keeps selector content mounted while switching to a selector whose position is not ready yet', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const columnItems = [{ id: 'name', label: 'Nama Item' }];
    const operatorItems = [{ id: 'contains', label: 'Contains' }];

    const { rerender } = render(
      <BaseSelector
        items={columnItems}
        isOpen
        onSelect={onSelect}
        onClose={onClose}
        position={{ top: 24, left: 40, isReady: true }}
        config={createConfig('Pilih kolom')}
        contentKey="column:active:0"
      />
    );

    const originalContent = document.querySelector(
      '[data-search-selector-content]'
    );
    expect(originalContent).not.toBeNull();
    expect(screen.getByText('Nama Item')).toBeTruthy();

    rerender(
      <BaseSelector
        items={operatorItems}
        isOpen
        onSelect={onSelect}
        onClose={onClose}
        position={{ top: 0, left: 0, isReady: false }}
        config={createConfig('Pilih operator filter')}
        contentKey="operator:active:0"
      />
    );

    expect(document.querySelector('[data-search-selector-content]')).toBe(
      originalContent
    );
    expect(screen.getByText('Contains')).toBeTruthy();
  });
});
