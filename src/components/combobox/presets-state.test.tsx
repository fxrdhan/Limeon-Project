import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PharmaComboboxSelect } from './index';

describe('Combobox app preset state interactions', () => {
  it('preserves cancelable details for preset value changes', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={(item, details) => {
          onValueChange(item, details);
          details.cancel();
        }}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Supplier B' },
    });
    fireEvent.click(screen.getByRole('option', { name: /supplier b/i }));

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ reason: 'item-press' })
    );
    expect((searchInput as HTMLInputElement).value).toBe('Supplier B');
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('preserves cancelable details for preset open changes', () => {
    const onOpenChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="supplier_id"
        items={[{ id: 'a', name: 'Supplier A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={supplier => supplier.name}
        itemToStringValue={supplier => supplier.id}
        onOpenChange={(nextOpen, details) => {
          onOpenChange(nextOpen, details);
          details.cancel();
        }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: expect.any(String) })
    );
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lets callers declare disabled items without relying on object shape', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="status"
        items={['active', 'archived']}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={value =>
          value === 'active' ? 'Aktif' : 'Diarsipkan'
        }
        itemToStringValue={value => value}
        isItemDisabled={value => value === 'archived'}
        searchable={false}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const disabledOption = screen.getByRole('option', { name: /diarsipkan/i });

    expect(disabledOption.hasAttribute('data-disabled')).toBe(true);
    fireEvent.click(disabledOption);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('selects non-searchable preset options from trigger keyboard state', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="status"
        items={['active', 'inactive']}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={value =>
          value === 'active' ? 'Aktif' : 'Tidak aktif'
        }
        itemToStringValue={value => value}
        searchable={false}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => {
      const activeDescendant = trigger.getAttribute('aria-activedescendant');
      expect(activeDescendant).toBeTruthy();
      expect(
        document.getElementById(activeDescendant as string)?.textContent
      ).toBe('Tidak aktif');
    });

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      'inactive',
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('continues non-searchable trigger navigation from the selected option', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="status"
        items={['active', 'inactive', 'paused']}
        value="inactive"
        onValueChange={onValueChange}
        itemToStringLabel={value => {
          if (value === 'active') return 'Aktif';
          if (value === 'inactive') return 'Tidak aktif';
          return 'Ditahan';
        }}
        itemToStringValue={value => value}
        searchable={false}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /tidak aktif/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const activeDescendant = trigger.getAttribute('aria-activedescendant');
      expect(activeDescendant).toBeTruthy();
      expect(
        document.getElementById(activeDescendant as string)?.textContent
      ).toBe('Tidak aktif');
    });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => {
      const activeDescendant = trigger.getAttribute('aria-activedescendant');
      expect(activeDescendant).toBeTruthy();
      expect(
        document.getElementById(activeDescendant as string)?.textContent
      ).toBe('Ditahan');
    });

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      'paused',
      expect.objectContaining({ reason: 'item-press' })
    );
  });
});
