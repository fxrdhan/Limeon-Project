import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PharmaComboboxSelect } from './index';

type EntityItem = { id: string; name: string };

describe('Combobox app preset hover detail', () => {
  it('shows hover detail data for preset entity options', async () => {
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: 'Analgesik',
      description: 'Detail kategori obat',
    }));

    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'analgesik', name: 'Analgesik' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        hoverDetail={{ enabled: true, delay: 0 }}
        onFetchHoverDetail={onFetchHoverDetail}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    fireEvent.mouseEnter(screen.getByRole('option', { name: /analgesik/i }));

    await waitFor(() => {
      expect(onFetchHoverDetail).toHaveBeenCalledWith('analgesik');
    });
    await waitFor(() => {
      expect(
        screen.getAllByText('Detail kategori obat').length
      ).toBeGreaterThan(0);
    });
    expect(
      document
        .querySelector('[data-combobox-hover-detail-sizer]')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
  });

  it('reports hover detail fetch failures without dropping base option data', async () => {
    const fetchError = new Error('fetch failed');
    const onFetchHoverDetail = vi.fn(async () => {
      throw fetchError;
    });
    const onFetchHoverDetailError = vi.fn();

    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'analgesik', name: 'Analgesik' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        hoverDetail={{ enabled: true, delay: 0 }}
        onFetchHoverDetail={onFetchHoverDetail}
        onFetchHoverDetailError={onFetchHoverDetailError}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    fireEvent.mouseEnter(screen.getByRole('option', { name: /analgesik/i }));

    await waitFor(() => {
      expect(onFetchHoverDetailError).toHaveBeenCalledWith(
        fetchError,
        'analgesik'
      );
    });
    expect(screen.getAllByText('Analgesik').length).toBeGreaterThan(0);
  });

  it('ignores pending hover detail fetch failures after unmount', async () => {
    const fetchError = new Error('fetch failed');
    let rejectFetch: (error: unknown) => void = () => {};
    const onFetchHoverDetail = vi.fn(
      () =>
        new Promise<null>((_resolve, reject) => {
          rejectFetch = reject;
        })
    );
    const onFetchHoverDetailError = vi.fn();
    const { unmount } = render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'analgesik', name: 'Analgesik' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        hoverDetail={{ enabled: true, delay: 0 }}
        onFetchHoverDetail={onFetchHoverDetail}
        onFetchHoverDetailError={onFetchHoverDetailError}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    fireEvent.mouseEnter(screen.getByRole('option', { name: /analgesik/i }));

    await waitFor(() => {
      expect(onFetchHoverDetail).toHaveBeenCalledWith('analgesik');
    });

    unmount();
    await act(async () => {
      rejectFetch(fetchError);
    });

    expect(onFetchHoverDetailError).not.toHaveBeenCalled();
  });

  it('does not run close cleanup when a controlled popup stays open', async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: 'Supplier B',
      description: 'Detail Supplier B',
    }));

    try {
      render(
        <PharmaComboboxSelect
          name="supplier_id"
          items={[
            { id: 'a', name: 'Supplier A' },
            { id: 'b', name: 'Supplier B' },
          ]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={supplier => supplier.name}
          itemToStringValue={supplier => supplier.id}
          hoverDetail={{ enabled: true, delay: 0 }}
          onFetchHoverDetail={onFetchHoverDetail}
          open
          onOpenChange={onOpenChange}
        />
      );

      const supplierB = screen.getByRole('option', { name: /supplier b/i });
      fireEvent.mouseEnter(supplierB);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onFetchHoverDetail).toHaveBeenCalledWith('b');
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );

      fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
        key: 'Escape',
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(onOpenChange).toHaveBeenCalledWith(
        false,
        expect.objectContaining({ reason: 'escape-key' })
      );
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
