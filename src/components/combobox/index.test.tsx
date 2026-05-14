import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Combobox } from './internal/primitive';
import { setupUserEvent } from '../../test/user-event';

const fruitItems = ['Apple', 'Banana', 'Cherry'];

function BasicCombobox({
  onValueChange,
}: {
  onValueChange?: (value: string | null) => void;
}) {
  const [value, setValue] = useState<string | null>('Apple');

  return (
    <Combobox.Root
      items={fruitItems}
      value={value}
      onValueChange={(nextValue, details) => {
        setValue(nextValue);
        onValueChange?.(nextValue);
        expect(details.reason).toBe('item-press');
      }}
      itemToStringLabel={item => item}
      itemToStringValue={item => item}
      name="fruit"
      autoHighlight
    >
      <Combobox.Label>Fruit</Combobox.Label>
      <Combobox.Trigger>
        <Combobox.Value placeholder="Choose fruit" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup initialFocus={false}>
            <Combobox.Input placeholder="Search fruit" />
            <Combobox.List<string>>
              {(item, index) => (
                <Combobox.Item key={item} value={item} index={index}>
                  {item}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

describe('Combobox primitive', () => {
  it('uses the local primitive value and item contract', async () => {
    const onValueChange = vi.fn();
    const user = setupUserEvent();
    render(<BasicCombobox onValueChange={onValueChange} />);

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    await user.click(trigger);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(
      screen
        .getByPlaceholderText('Search fruit')
        .getAttribute('aria-labelledby')
    ).toBe(screen.getByText('Fruit').id);
    expect(
      screen.getByPlaceholderText('Search fruit').getAttribute('role')
    ).toBe('searchbox');
    await user.click(screen.getByRole('option', { name: /banana/i }));

    expect(onValueChange).toHaveBeenCalledWith('Banana');
    expect(trigger.textContent).toContain('Banana');
    expect(
      document.querySelector('input[name="fruit"]')?.getAttribute('value')
    ).toBe('Banana');
  });

  it('keeps object values native while using custom equality and stringification', () => {
    const items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];
    const selected = { id: 'a', name: 'Alpha copy' };
    const onValueChange = vi.fn();

    render(
      <Combobox.Root
        items={items}
        value={selected}
        onValueChange={onValueChange}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        isItemEqualToValue={(item, value) => item.id === value.id}
        name="entity_id"
      >
        <Combobox.Trigger aria-label="Entity">
          <Combobox.Value placeholder="Choose entity" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<{ id: string; name: string }>>
                {(item, index) => (
                  <Combobox.Item key={item.id} value={item} index={index}>
                    {item.name}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /entity/i }));
    expect(
      screen
        .getByRole('option', { name: /alpha/i })
        .hasAttribute('data-selected')
    ).toBe(true);
    fireEvent.click(screen.getByRole('option', { name: /beta/i }));

    expect(onValueChange).toHaveBeenCalledWith(
      items[1],
      expect.objectContaining({ reason: 'item-press' })
    );
    expect(
      document.querySelector('input[name="entity_id"]')?.getAttribute('value')
    ).toBe('a');
  });

  it('keeps highlight event cancellation state observable', async () => {
    const onHighlightCanceled = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        onItemHighlighted={(item, details) => {
          if (!item) return;

          details.cancel();
          onHighlightCanceled(details.isCanceled);
        }}
        autoHighlight
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /fruit/i }));

    await waitFor(() => {
      expect(onHighlightCanceled).toHaveBeenCalledWith(true);
    });
  });

  it('lets callers cancel highlight changes before state commits', async () => {
    const onItemHighlighted = vi.fn(
      (_item: string | undefined, details: { cancel: () => void }) => {
        details.cancel();
      }
    );

    render(
      <Combobox.Root
        items={fruitItems}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        onItemHighlighted={onItemHighlighted}
        autoHighlight
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(onItemHighlighted).toHaveBeenCalled();
    });
    expect(trigger.getAttribute('aria-activedescendant')).toBeNull();
    expect(
      screen
        .getByRole('option', { name: /apple/i })
        .hasAttribute('data-highlighted')
    ).toBe(false);
  });

  it('lets callers control highlighted index declaratively', () => {
    function ControlledHighlightedCombobox() {
      const [highlightedIndex, setHighlightedIndex] = useState<number | null>(
        1
      );

      return (
        <Combobox.Root
          items={fruitItems}
          defaultOpen
          highlightedIndex={highlightedIndex}
          onHighlightedIndexChange={setHighlightedIndex}
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
        >
          <Combobox.Trigger aria-label="Fruit">
            <Combobox.Value placeholder="Choose fruit" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup initialFocus={false}>
                <Combobox.List<string>>
                  {(item, index) => (
                    <Combobox.Item key={item} value={item} index={index}>
                      {item}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      );
    }

    render(<ControlledHighlightedCombobox />);

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const banana = screen.getByRole('option', { name: /banana/i });
    const cherry = screen.getByRole('option', { name: /cherry/i });

    expect(banana.hasAttribute('data-highlighted')).toBe(true);
    expect(trigger.getAttribute('aria-activedescendant')).toBe(banana.id);

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(cherry.hasAttribute('data-highlighted')).toBe(true);
    expect(trigger.getAttribute('aria-activedescendant')).toBe(cherry.id);
  });

  it('does not expose active descendants while the primitive popup is closed', () => {
    render(
      <Combobox.Root
        items={fruitItems}
        highlightedIndex={1}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Input aria-label="Search fruit" />
      </Combobox.Root>
    );

    expect(
      screen
        .getByRole('combobox', { name: /fruit/i })
        .getAttribute('aria-activedescendant')
    ).toBeNull();
    expect(
      screen
        .getByRole('searchbox', { name: /search fruit/i })
        .getAttribute('aria-activedescendant')
    ).toBeNull();
  });

  it('does not commit a disabled highlighted item from keyboard input', () => {
    const onValueChange = vi.fn();
    const statusItems = ['active', 'archived'];

    render(
      <Combobox.Root
        items={statusItems}
        defaultOpen
        highlightedIndex={1}
        onValueChange={onValueChange}
        itemToStringLabel={item => (item === 'active' ? 'Aktif' : 'Diarsipkan')}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Status">
          <Combobox.Value placeholder="Pilih status" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item
                    key={item}
                    value={item}
                    index={index}
                    disabled={item === 'archived'}
                  >
                    {item === 'active' ? 'Aktif' : 'Diarsipkan'}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.keyDown(screen.getByRole('combobox', { name: /status/i }), {
      key: 'Enter',
    });

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('throws when an item index does not point at the rendered value', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => {
        render(
          <Combobox.Root
            items={fruitItems}
            defaultOpen
            itemToStringLabel={item => item}
            itemToStringValue={item => item}
          >
            <Combobox.Trigger aria-label="Fruit">
              <Combobox.Value placeholder="Choose fruit" />
            </Combobox.Trigger>
            <Combobox.Portal>
              <Combobox.Positioner>
                <Combobox.Popup initialFocus={false}>
                  <Combobox.List<string>>
                    {(_item, index) => (
                      <Combobox.Item key={index} value="Cherry" index={index}>
                        Cherry
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        );
      }).toThrow('Combobox.Item value/index mismatch');
    } finally {
      error.mockRestore();
    }
  });

  it('prevents primitive popup search Enter when no option is active', () => {
    const onValueChange = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        defaultOpen
        onValueChange={onValueChange}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input aria-label="Search fruit" />
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    fireEvent(
      screen.getByRole('searchbox', { name: /search fruit/i }),
      enterEvent
    );

    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('moves trigger highlight to first and last enabled items with Home and End', () => {
    const statusItems = ['disabled-start', 'active', 'pending', 'disabled-end'];

    render(
      <Combobox.Root
        items={statusItems}
        defaultOpen
        defaultHighlightedIndex={2}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        isItemDisabled={item => item.startsWith('disabled')}
      >
        <Combobox.Trigger aria-label="Status">
          <Combobox.Value placeholder="Pilih status" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const trigger = screen.getByRole('combobox', { name: /status/i });
    const active = screen.getByRole('option', { name: /^active$/i });
    const pending = screen.getByRole('option', { name: /^pending$/i });

    expect(pending.hasAttribute('data-highlighted')).toBe(true);

    fireEvent.keyDown(trigger, { key: 'Home' });

    expect(active.hasAttribute('data-highlighted')).toBe(true);

    fireEvent.keyDown(trigger, { key: 'End' });

    expect(pending.hasAttribute('data-highlighted')).toBe(true);
  });

  it('moves trigger highlight by page with PageUp and PageDown', () => {
    const statusItems = Array.from(
      { length: 12 },
      (_item, index) => `Item ${index}`
    );

    render(
      <Combobox.Root
        items={statusItems}
        defaultOpen
        defaultHighlightedIndex={0}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Status">
          <Combobox.Value placeholder="Pilih status" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const trigger = screen.getByRole('combobox', { name: /status/i });
    const first = screen.getByRole('option', { name: /^item 0$/i });
    const pageTarget = screen.getByRole('option', { name: /^item 10$/i });

    fireEvent.keyDown(trigger, { key: 'PageDown' });

    expect(pageTarget.hasAttribute('data-highlighted')).toBe(true);

    fireEvent.keyDown(trigger, { key: 'PageUp' });

    expect(first.hasAttribute('data-highlighted')).toBe(true);
  });

  it('moves popup search highlight by page with PageUp and PageDown', () => {
    const statusItems = Array.from(
      { length: 12 },
      (_item, index) => `Item ${index}`
    );

    render(
      <Combobox.Root
        items={statusItems}
        defaultOpen
        defaultHighlightedIndex={0}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Status">
          <Combobox.Value placeholder="Pilih status" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input aria-label="Cari status" />
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const searchInput = screen.getByRole('searchbox', { name: /cari status/i });
    const first = screen.getByRole('option', { name: /^item 0$/i });
    const pageTarget = screen.getByRole('option', { name: /^item 10$/i });

    fireEvent.keyDown(searchInput, { key: 'PageDown' });

    expect(pageTarget.hasAttribute('data-highlighted')).toBe(true);

    fireEvent.keyDown(searchInput, { key: 'PageUp' });

    expect(first.hasAttribute('data-highlighted')).toBe(true);
  });

  it('moves trigger highlight by basic typeahead while open', () => {
    const medicineItems = ['Amoxicillin', 'Cetirizine', 'Dextrose', 'Diazepam'];

    render(
      <Combobox.Root
        items={medicineItems}
        defaultOpen
        defaultHighlightedIndex={0}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        isItemDisabled={item => item === 'Dextrose'}
      >
        <Combobox.Trigger aria-label="Medicine">
          <Combobox.Value placeholder="Pilih obat" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.keyDown(screen.getByRole('combobox', { name: /medicine/i }), {
      key: 'd',
    });

    expect(
      screen
        .getByRole('option', { name: /^diazepam$/i })
        .hasAttribute('data-highlighted')
    ).toBe(true);
  });

  it('closes the portaled popup on outside pointer down', async () => {
    const onOpenChange = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        onOpenChange={onOpenChange}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /fruit/i }));
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole('option', { name: /apple/i }));
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ reason: 'outside-press' })
    );
  });

  it('closes on outside pointer down before propagation is stopped', async () => {
    render(
      <>
        <Combobox.Root
          items={fruitItems}
          defaultOpen
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
        >
          <Combobox.Trigger aria-label="Fruit">
            <Combobox.Value placeholder="Choose fruit" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup initialFocus={false}>
                <Combobox.List<string>>
                  {(item, index) => (
                    <Combobox.Item key={item} value={item} index={index}>
                      {item}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <button type="button" onPointerDown={event => event.stopPropagation()}>
          Outside stopper
        </button>
      </>
    );

    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /outside stopper/i })
    );

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });

  it('lets callers cancel outside pointer dismissal', () => {
    render(
      <Combobox.Root
        items={fruitItems}
        defaultOpen
        onOpenChange={(_open, details) => {
          details.cancel();
        }}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.pointerDown(document.body);

    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('keeps the popup open for portaled internal focus and closes when focus leaves', async () => {
    const onOpenChange = vi.fn();

    render(
      <>
        <Combobox.Root
          items={fruitItems}
          defaultOpen
          onOpenChange={onOpenChange}
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
        >
          <Combobox.Trigger aria-label="Fruit">
            <Combobox.Value placeholder="Choose fruit" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup initialFocus={false}>
                <Combobox.Input aria-label="Search fruit" />
                <Combobox.List<string>>
                  {(item, index) => (
                    <Combobox.Item key={item} value={item} index={index}>
                      {item}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <button type="button">After combobox</button>
      </>
    );

    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.focusIn(screen.getByRole('searchbox', { name: /search fruit/i }));
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.focusIn(screen.getByRole('button', { name: /after combobox/i }));

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ reason: 'focus-out' })
    );
  });

  it('lets callers cancel focus-out dismissal', () => {
    render(
      <>
        <Combobox.Root
          items={fruitItems}
          defaultOpen
          onOpenChange={(_open, details) => {
            details.cancel();
          }}
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
        >
          <Combobox.Trigger aria-label="Fruit">
            <Combobox.Value placeholder="Choose fruit" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup initialFocus={false}>
                <Combobox.List<string>>
                  {(item, index) => (
                    <Combobox.Item key={item} value={item} index={index}>
                      {item}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <button type="button">After combobox</button>
      </>
    );

    fireEvent.focusIn(screen.getByRole('button', { name: /after combobox/i }));

    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('does not move highlight when a keyboard open request is canceled', () => {
    const onHighlightedIndexChange = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        onOpenChange={(_open, details) => {
          details.cancel();
        }}
        onHighlightedIndexChange={onHighlightedIndexChange}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger.getAttribute('aria-activedescendant')).toBeNull();
    expect(onHighlightedIndexChange).not.toHaveBeenCalled();
  });

  it('filters with the native input and accepts caller-supplied filteredItems', async () => {
    const user = setupUserEvent();
    const { rerender } = render(<BasicCombobox />);

    await user.click(screen.getByRole('combobox', { name: /fruit/i }));
    await user.type(screen.getByPlaceholderText('Search fruit'), 'cher');
    expect(screen.getByRole('option', { name: /cherry/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /banana/i })).toBeNull();

    rerender(
      <Combobox.Root items={fruitItems} filteredItems={['Banana']}>
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input placeholder="Search fruit" />
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );
    fireEvent.click(screen.getByRole('combobox', { name: /fruit/i }));
    expect(screen.getByPlaceholderText('Search fruit')).toBeTruthy();
    expect(screen.getByRole('option', { name: /banana/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /apple/i })).toBeNull();
  });
});
