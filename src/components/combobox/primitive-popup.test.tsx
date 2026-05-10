import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { Combobox } from './index';

const fruitItems = ['Apple', 'Banana', 'Cherry'];

describe('Combobox primitive popup', () => {
  it('renders portal content into a caller supplied container', () => {
    const portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);

    const { unmount } = render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Label>Fruit</Combobox.Label>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal container={portalContainer}>
          <Combobox.Positioner placement="top-start">
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

    expect(portalContainer.querySelector('[role="listbox"]')).toBe(
      screen.getByRole('listbox')
    );

    unmount();
    portalContainer.remove();
  });

  it('uses Floating UI sizing variables for the primitive popup', async () => {
    const innerHeightDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'innerHeight'
    );
    const innerWidthDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'innerWidth'
    );

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    });

    try {
      render(
        <Combobox.Root
          items={fruitItems}
          value="Apple"
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
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

      const trigger = screen.getByRole('combobox', { name: /fruit/i });
      Object.defineProperty(trigger, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          bottom: 590,
          height: 30,
          left: 16,
          right: 216,
          toJSON: () => {},
          top: 560,
          width: 200,
          x: 16,
          y: 560,
        }),
      });

      fireEvent.click(trigger);

      const listbox = await screen.findByRole('listbox');
      const positioner = listbox.parentElement?.parentElement;
      expect(positioner?.style.position).toBe('fixed');
      expect(positioner?.style.width).toBe('var(--anchor-width)');
      expect(positioner?.style.maxHeight).toBe('var(--available-height)');
      expect(positioner?.style.overflow).toBe('visible');
    } finally {
      if (innerHeightDescriptor) {
        Object.defineProperty(window, 'innerHeight', innerHeightDescriptor);
      }
      if (innerWidthDescriptor) {
        Object.defineProperty(window, 'innerWidth', innerWidthDescriptor);
      }
    }
  });

  it('focuses the first popup control when primitive initialFocus is enabled', async () => {
    render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus>
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

    const searchInput = screen.getByPlaceholderText('Search fruit');
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
  });
});
