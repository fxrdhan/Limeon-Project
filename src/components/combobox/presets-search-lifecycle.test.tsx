import { useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PharmaComboboxSelect } from './index';

describe('Combobox app preset search lifecycle', () => {
  it('resets searchable preset input when the popup closes without a selection', () => {
    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Cari...'), {
      target: { value: 'Supplier B' },
    });
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();

    fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
      key: 'Escape',
    });
    fireEvent.click(trigger);

    expect(
      (screen.getByPlaceholderText('Cari...') as HTMLInputElement).value
    ).toBe('');
    expect(screen.getByRole('option', { name: /supplier a/i })).toBeTruthy();
  });

  it('keeps searchable preset input when a controlled popup remains open', () => {
    const onOpenChange = vi.fn();
    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
        interaction={{ open: true, onOpenChange: onOpenChange }}
      />
    );

    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Supplier B' },
    });
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: 'escape-key' })
    );
    expect((searchInput as HTMLInputElement).value).toBe('Supplier B');
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
  });

  it('keeps controlled close focus intent until the delayed close applies', async () => {
    function ControlledOpenCombobox() {
      const [open, setOpen] = useState(true);
      const [, rerenderOpen] = useState(0);

      return (
        <>
          <PharmaComboboxSelect
            items={[
              { id: 'a', name: 'Supplier A' },
              { id: 'b', name: 'Supplier B' },
            ]}
            value={null}
            onValueChange={() => {}}
            item={{
              toLabel: supplier => supplier.name,
              toValue: supplier => supplier.id,
            }}
            field={{ name: 'supplier_id' }}
            interaction={{ open: open, onOpenChange: () => {} }}
          />
          <button
            type="button"
            onClick={() => rerenderOpen(count => count + 1)}
          >
            Rerender open
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Close later
          </button>
        </>
      );
    }

    render(<ControlledOpenCombobox />);

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
      key: 'Escape',
    });

    await act(async () => {
      await new Promise<void>(resolve => {
        window.requestAnimationFrame(() => resolve());
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /rerender open/i }));
    fireEvent.click(screen.getByRole('button', { name: /close later/i }));

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('routes trigger typing into the open searchable input', () => {
    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Branch B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'b' });

    const searchInput = screen.getByPlaceholderText('Cari...');
    expect((searchInput as HTMLInputElement).value).toBe('b');
    expect(document.activeElement).toBe(searchInput);
    expect(screen.queryByRole('option', { name: /supplier a/i })).toBeNull();
    expect(screen.getByRole('option', { name: /branch b/i })).toBeTruthy();
  });

  it('lets Space commit the active option from an open searchable trigger', async () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={onValueChange}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
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
      ).toBe('Supplier B');
    });

    fireEvent.keyDown(trigger, { key: ' ' });

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('keeps arrow navigation from visually activating the popup search input', () => {
    render(
      <PharmaComboboxSelect
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        item={{
          toLabel: supplier => supplier.name,
          toValue: supplier => supplier.id,
        }}
        field={{ name: 'supplier_id' }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih/i });
    fireEvent.click(trigger);
    const searchInput = screen.getByPlaceholderText('Cari...');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(true);

    fireEvent.keyDown(searchInput, { key: 'b' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(false);

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(true);

    fireEvent.pointerDown(searchInput);
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(false);

    fireEvent.keyDown(searchInput, { key: 'PageDown' });
    expect(
      searchInput.hasAttribute('data-pharma-combobox-navigation-focus')
    ).toBe(true);
  });
});
