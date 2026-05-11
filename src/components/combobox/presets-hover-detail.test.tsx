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
import { getHoverDetailGeometry } from './utils/preset-hover-detail-popover';

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

  it('keeps hover detail geometry inside the popup vertical boundary', () => {
    const geometry = getHoverDetailGeometry(
      {
        top: 40,
        left: 180,
        boundaryTop: 100,
        boundaryBottom: 180,
        direction: 'right',
        anchorCenterY: 56,
        maxWidth: 380,
      },
      { width: 240, height: 60 }
    );

    expect(geometry.y).toBe(100);
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(180);
  });

  it('hides hover detail while the option list scrolls and restores it after scroll settles', async () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        itemToHoverDetailData={item => ({
          description: `Detail ${item.name}`,
        })}
        placeholder="Pilih supplier"
        hoverDetail={{ enabled: true, delay: 0 }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih supplier/i }));
    fireEvent.mouseEnter(screen.getByRole('option', { name: /supplier a/i }));

    await waitFor(() => {
      expect(
        document.querySelector<HTMLElement>(
          '[data-combobox-hover-detail-popover]'
        )?.style.pointerEvents
      ).not.toBe('none');
    });

    fireEvent.scroll(screen.getByRole('listbox'));

    await waitFor(() => {
      const popover = document.querySelector<HTMLElement>(
        '[data-combobox-hover-detail-popover]'
      );

      expect(popover === null || popover.style.pointerEvents === 'none').toBe(
        true
      );
    });
    await act(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 180);
      });
    });

    await waitFor(() => {
      expect(
        document.querySelector<HTMLElement>(
          '[data-combobox-hover-detail-popover]'
        )?.style.pointerEvents
      ).not.toBe('none');
    });
  });

  it('moves visible hover detail to the keyboard-highlighted background', async () => {
    const originalInnerWidth = Object.getOwnPropertyDescriptor(
      window,
      'innerWidth'
    );
    const originalGetBoundingClientRect = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'getBoundingClientRect'
    );
    const createRect = ({
      height,
      left,
      top,
      width,
    }: {
      height: number;
      left: number;
      top: number;
      width: number;
    }) =>
      ({
        bottom: top + height,
        height,
        left,
        right: left + width,
        toJSON: () => {},
        top,
        width,
        x: left,
        y: top,
      }) as DOMRect;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: function getBoundingClientRect(this: HTMLElement) {
        if (this.hasAttribute('data-pharma-combobox-highlight')) {
          return createRect({ height: 32, left: 20, top: 140, width: 180 });
        }

        if (
          this.getAttribute('role') === 'option' &&
          this.textContent?.includes('Supplier B')
        ) {
          return createRect({ height: 32, left: 450, top: 140, width: 40 });
        }

        if (
          this.getAttribute('role') === 'option' &&
          this.textContent?.includes('Supplier A')
        ) {
          return createRect({ height: 32, left: 20, top: 100, width: 100 });
        }

        return originalGetBoundingClientRect?.value
          ? originalGetBoundingClientRect.value.call(this)
          : createRect({ height: 0, left: 0, top: 0, width: 0 });
      },
    });

    try {
      render(
        <PharmaComboboxSelect<EntityItem>
          name="supplier_id"
          items={[
            { id: 'a', name: 'Supplier A' },
            { id: 'b', name: 'Supplier B' },
          ]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          itemToHoverDetailData={item => ({
            description: `Detail ${item.name}`,
          })}
          placeholder="Pilih supplier"
          hoverDetail={{ enabled: true, delay: 0 }}
        />
      );

      fireEvent.click(
        screen.getByRole('combobox', { name: /pilih supplier/i })
      );
      const supplierA = screen.getByRole('option', { name: /supplier a/i });
      const supplierB = screen.getByRole('option', { name: /supplier b/i });

      fireEvent.mouseEnter(supplierA);

      await waitFor(() => {
        expect(
          (
            document.querySelector(
              '[data-combobox-hover-detail-sizer]'
            ) as HTMLElement | null
          )?.style.maxWidth
        ).toBe('350px');
      });

      fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
        key: 'ArrowDown',
      });

      await waitFor(() => {
        expect(
          supplierB.querySelector('[data-pharma-combobox-highlight]')
        ).toBeTruthy();
      });
      await waitFor(() => {
        expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
          0
        );
        expect(
          (
            document.querySelector(
              '[data-combobox-hover-detail-sizer]'
            ) as HTMLElement | null
          )?.style.maxWidth
        ).toBe('270px');
      });
    } finally {
      if (originalInnerWidth) {
        Object.defineProperty(window, 'innerWidth', originalInnerWidth);
      } else {
        Reflect.deleteProperty(window, 'innerWidth');
      }

      if (originalGetBoundingClientRect) {
        Object.defineProperty(
          HTMLElement.prototype,
          'getBoundingClientRect',
          originalGetBoundingClientRect
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'getBoundingClientRect');
      }
    }
  });

  it('shows hover detail from keyboard navigation without pointer hover', async () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="supplier_id"
        items={[
          { id: 'a', name: 'Supplier A' },
          { id: 'b', name: 'Supplier B' },
        ]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        itemToHoverDetailData={item => ({
          description: `Detail ${item.name}`,
        })}
        placeholder="Pilih supplier"
        hoverDetail={{ enabled: true, delay: 400 }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih supplier/i }));
    fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
      key: 'ArrowDown',
    });

    await waitFor(() => {
      expect(
        screen
          .getByRole('option', { name: /supplier b/i })
          .querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );
    });
  });

  it('shows hover detail from the selected trigger value', async () => {
    const suppliers = [
      { id: 'a', name: 'Supplier A' },
      { id: 'b', name: 'Supplier B' },
    ];

    render(
      <PharmaComboboxSelect<EntityItem>
        name="supplier_id"
        items={suppliers}
        value={suppliers[1] ?? null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        itemToHoverDetailData={item => ({
          description: `Detail ${item.name}`,
        })}
        placeholder="Pilih supplier"
        hoverDetail={{ enabled: true, delay: 0 }}
      />
    );

    fireEvent.mouseEnter(screen.getByRole('combobox', { name: /supplier b/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );
    });
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

  it('debounces keyboard hover detail while keyboard navigation is moving quickly', async () => {
    vi.useFakeTimers();

    try {
      render(
        <PharmaComboboxSelect<EntityItem>
          name="supplier_id"
          items={[
            { id: 'a', name: 'Supplier A' },
            { id: 'b', name: 'Supplier B' },
            { id: 'c', name: 'Supplier C' },
          ]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          itemToHoverDetailData={item => ({
            description: `Detail ${item.name}`,
          })}
          placeholder="Pilih supplier"
          hoverDetail={{ enabled: true, delay: 400 }}
        />
      );

      fireEvent.click(
        screen.getByRole('combobox', { name: /pilih supplier/i })
      );
      const searchInput = screen.getByPlaceholderText('Cari...');

      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(80);
      });
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(80);
      });
      expect(screen.queryByText('Detail Supplier B')).toBeNull();
      expect(screen.queryByText('Detail Supplier C')).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(screen.queryByText('Detail Supplier B')).toBeNull();
      expect(screen.getAllByText('Detail Supplier C').length).toBeGreaterThan(
        0
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('replaces pending hover detail when keyboard highlight takes over', async () => {
    vi.useFakeTimers();

    try {
      render(
        <PharmaComboboxSelect<EntityItem>
          name="supplier_id"
          items={[
            { id: 'a', name: 'Supplier A' },
            { id: 'b', name: 'Supplier B' },
          ]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          itemToHoverDetailData={item => ({
            description: `Detail ${item.name}`,
          })}
          placeholder="Pilih supplier"
          hoverDetail={{ enabled: true, delay: 400 }}
        />
      );

      fireEvent.click(
        screen.getByRole('combobox', { name: /pilih supplier/i })
      );
      const supplierA = screen.getByRole('option', { name: /supplier a/i });
      const supplierB = screen.getByRole('option', { name: /supplier b/i });

      fireEvent.mouseEnter(supplierA);
      fireEvent.keyDown(screen.getByPlaceholderText('Cari...'), {
        key: 'ArrowDown',
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(
        supplierB.querySelector('[data-pharma-combobox-highlight]')
      ).toBeTruthy();
      expect(screen.queryByText('Detail Supplier A')).toBeNull();
      expect(screen.getAllByText('Detail Supplier B').length).toBeGreaterThan(
        0
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
