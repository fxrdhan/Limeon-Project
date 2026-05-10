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

  it('keeps hover detail geometry anchored when the viewport scrolls', async () => {
    const originalInnerWidth = Object.getOwnPropertyDescriptor(
      window,
      'innerWidth'
    );

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 500,
    });

    try {
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
        />
      );

      fireEvent.click(
        screen.getByRole('combobox', { name: /pilih kategori/i })
      );
      const option = screen.getByRole('option', { name: /analgesik/i });
      let optionRect = {
        bottom: 132,
        height: 32,
        left: 20,
        right: 120,
        toJSON: () => {},
        top: 100,
        width: 100,
        x: 20,
        y: 100,
      };

      Object.defineProperty(option, 'getBoundingClientRect', {
        configurable: true,
        value: () => optionRect,
      });

      fireEvent.mouseEnter(option);

      await waitFor(() => {
        expect(
          (
            document.querySelector(
              '[data-combobox-hover-detail-sizer]'
            ) as HTMLElement | null
          )?.style.maxWidth
        ).toBe('350px');
      });

      optionRect = {
        ...optionRect,
        bottom: 132,
        left: 450,
        right: 490,
        top: 100,
        width: 40,
        x: 450,
      };
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(
          (
            document.querySelector(
              '[data-combobox-hover-detail-sizer]'
            ) as HTMLElement | null
          )?.style.maxWidth
        ).toBe('380px');
      });
    } finally {
      if (originalInnerWidth) {
        Object.defineProperty(window, 'innerWidth', originalInnerWidth);
      } else {
        Reflect.deleteProperty(window, 'innerWidth');
      }
    }
  });

  it('keeps hover detail exit animation from intercepting pointer input', async () => {
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
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    const option = screen.getByRole('option', { name: /analgesik/i });
    fireEvent.mouseEnter(option);

    await waitFor(() => {
      const popover = document.querySelector<HTMLElement>(
        '[data-combobox-hover-detail-popover]'
      );

      expect(popover).not.toBeNull();
      expect(popover?.style.pointerEvents).not.toBe('none');
    });

    fireEvent.mouseLeave(option);

    await waitFor(() => {
      const popover = document.querySelector<HTMLElement>(
        '[data-combobox-hover-detail-popover]'
      );

      expect(popover).not.toBeNull();
      expect(popover?.style.pointerEvents).toBe('none');
    });
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

  it('clears visible hover detail state when hover detail is disabled', async () => {
    const onFetchHoverDetail = vi.fn(async (id: string) => ({
      id,
      name: 'Analgesik',
      description: 'Detail kategori obat',
    }));

    function ToggleableHoverDetailCombobox() {
      const [enabled, setEnabled] = useState(true);

      return (
        <>
          <button type="button" onClick={() => setEnabled(false)}>
            Disable hover detail
          </button>
          <button type="button" onClick={() => setEnabled(true)}>
            Enable hover detail
          </button>
          <PharmaComboboxSelect<EntityItem>
            name="category_id"
            items={[{ id: 'analgesik', name: 'Analgesik' }]}
            value={null}
            onValueChange={() => {}}
            itemToStringLabel={item => item.name}
            itemToStringValue={item => item.id}
            placeholder="Pilih kategori"
            hoverDetail={{ enabled, delay: 0 }}
            onFetchHoverDetail={onFetchHoverDetail}
            open
          />
        </>
      );
    }

    render(<ToggleableHoverDetailCombobox />);

    fireEvent.mouseEnter(screen.getByRole('option', { name: /analgesik/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Detail kategori obat').length
      ).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getByRole('button', { name: /disable hover detail/i })
    );

    await waitFor(() => {
      expect(screen.queryByText('Detail kategori obat')).toBeNull();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /enable hover detail/i })
    );

    expect(screen.queryByText('Detail kategori obat')).toBeNull();
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
