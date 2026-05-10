import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { Combobox } from './index';

const fruitItems = ['Apple', 'Banana', 'Cherry'];

describe('Combobox primitive labels', () => {
  it('keeps label htmlFor locked to the primitive trigger id', async () => {
    render(
      <Combobox.Root items={fruitItems}>
        <Combobox.Label htmlFor="wrong-trigger">Fruit</Combobox.Label>
        <Combobox.Trigger id="fruit-trigger">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
      </Combobox.Root>
    );

    await waitFor(() => {
      expect(screen.getByText('Fruit').getAttribute('for')).toBe(
        'fruit-trigger'
      );
    });
  });

  it('keeps custom primitive label ids connected to trigger and listbox aria', async () => {
    render(
      <Combobox.Root items={fruitItems}>
        <Combobox.Label id="custom-fruit-label">Fruit</Combobox.Label>
        <Combobox.Trigger>
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

    const trigger = await screen.findByRole('combobox', { name: /^fruit$/i });
    expect(trigger.getAttribute('aria-labelledby')).toBe('custom-fruit-label');

    fireEvent.click(trigger);

    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      'custom-fruit-label'
    );
  });

  it('generates distinct ids for multiple implicit primitive labels', () => {
    render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Label>Fruit</Combobox.Label>
        <Combobox.Label>Required</Combobox.Label>
        <Combobox.Trigger>
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

    const fruitLabel = screen.getByText('Fruit');
    const requiredLabel = screen.getByText('Required');

    expect(fruitLabel.id.length).toBeGreaterThan(0);
    expect(requiredLabel.id.length).toBeGreaterThan(0);
    expect(fruitLabel.id).not.toBe(requiredLabel.id);

    const labelIds = `${fruitLabel.id} ${requiredLabel.id}`;
    expect(screen.getByRole('combobox').getAttribute('aria-labelledby')).toBe(
      labelIds
    );
    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      labelIds
    );
  });

  it('keeps remaining primitive labels registered after another label unmounts', () => {
    function MultiLabelCombobox() {
      const [showSecondaryLabel, setShowSecondaryLabel] = useState(true);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setShowSecondaryLabel(false);
            }}
          >
            Hide secondary label
          </button>
          <Combobox.Root items={fruitItems} defaultOpen>
            <Combobox.Label id="primary-fruit-label">Fruit</Combobox.Label>
            {showSecondaryLabel ? (
              <Combobox.Label id="secondary-fruit-label">
                Required
              </Combobox.Label>
            ) : null}
            <Combobox.Trigger>
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
        </>
      );
    }

    render(<MultiLabelCombobox />);

    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('aria-labelledby')).toBe(
      'primary-fruit-label secondary-fruit-label'
    );
    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      'primary-fruit-label secondary-fruit-label'
    );

    fireEvent.click(screen.getByRole('button', { name: /hide secondary/i }));

    expect(trigger.getAttribute('aria-labelledby')).toBe('primary-fruit-label');
    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      'primary-fruit-label'
    );
  });

  it('preserves caller supplied primitive listbox labels', () => {
    render(
      <>
        <span id="custom-list-label">Filtered fruits</span>
        <Combobox.Root items={fruitItems} defaultOpen>
          <Combobox.Trigger aria-label="Fruit">
            <Combobox.Value placeholder="Choose fruit" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup initialFocus={false}>
                <Combobox.List<string> aria-labelledby="custom-list-label">
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
      </>
    );

    expect(screen.getByRole('listbox').getAttribute('aria-labelledby')).toBe(
      'custom-list-label'
    );
  });

  it('lets primitive listbox aria-label override contextual labels', () => {
    render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Label>Fruit</Combobox.Label>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string> aria-label="Filtered fruits">
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

    const listbox = screen.getByRole('listbox', { name: /filtered fruits/i });
    expect(listbox.hasAttribute('aria-labelledby')).toBe(false);
  });
});
