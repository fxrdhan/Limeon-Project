import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Combobox } from './index';

const fruitItems = ['Apple', 'Banana', 'Cherry'];

describe('Combobox primitive form and input state', () => {
  it('keeps required semantics out of the hidden submitted value', () => {
    render(
      <Combobox.Root
        items={fruitItems}
        value="Apple"
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
        name="required_fruit"
        required
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
      </Combobox.Root>
    );

    const hiddenInput = document.querySelector('input[name="required_fruit"]');
    expect(hiddenInput?.getAttribute('value')).toBe('Apple');
    expect(hiddenInput?.hasAttribute('required')).toBe(false);
    expect(
      document
        .querySelector<HTMLInputElement>('[data-combobox-required-input]')
        ?.checkValidity()
    ).toBe(true);
  });

  it('uses a separate validation proxy for empty required values', () => {
    render(
      <form>
        <Combobox.Root
          items={fruitItems}
          value={null}
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
          name="required_fruit"
          required
        >
          <Combobox.Trigger aria-label="Fruit">
            <Combobox.Value placeholder="Choose fruit" />
          </Combobox.Trigger>
        </Combobox.Root>
      </form>
    );

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const hiddenInput = document.querySelector<HTMLInputElement>(
      'input[name="required_fruit"]'
    );
    const validationProxy = document.querySelector<HTMLInputElement>(
      '[data-combobox-required-input]'
    );

    expect(hiddenInput?.type).toBe('hidden');
    expect(hiddenInput?.hasAttribute('required')).toBe(false);
    expect(validationProxy?.required).toBe(true);
    expect(validationProxy?.name).toBe('');
    expect(validationProxy?.checkValidity()).toBe(false);

    fireEvent.invalid(validationProxy as HTMLInputElement);

    expect(document.activeElement).toBe(trigger);
  });

  it('keeps controlled null values from falling back to defaultValue', () => {
    function ControlledNullableCombobox() {
      const [value, setValue] = useState<string | null>('Banana');

      return (
        <>
          <button type="button" onClick={() => setValue(null)}>
            Clear fruit
          </button>
          <Combobox.Root
            items={fruitItems}
            defaultValue="Apple"
            value={value}
            onValueChange={setValue}
            itemToStringLabel={item => item}
            itemToStringValue={item => item}
            name="controlled_fruit"
          >
            <Combobox.Trigger aria-label="Fruit">
              <Combobox.Value placeholder="Choose fruit" />
            </Combobox.Trigger>
          </Combobox.Root>
        </>
      );
    }

    render(<ControlledNullableCombobox />);

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const hiddenInput = document.querySelector<HTMLInputElement>(
      'input[name="controlled_fruit"]'
    );
    expect(trigger.textContent).toContain('Banana');
    expect(hiddenInput?.value).toBe('Banana');

    fireEvent.click(screen.getByRole('button', { name: /clear fruit/i }));

    expect(trigger.textContent).toContain('Choose fruit');
    expect(hiddenInput?.value).toBe('');
  });

  it('restores uncontrolled state and hidden value on native form reset', () => {
    render(
      <form data-testid="fruit-form">
        <Combobox.Root
          items={fruitItems}
          defaultValue="Apple"
          defaultOpen
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
          name="fruit"
        >
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
      </form>
    );

    const form = screen.getByTestId('fruit-form');
    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const hiddenInput = document.querySelector<HTMLInputElement>(
      'input[name="fruit"]'
    );
    const searchInput = screen.getByRole('searchbox') as HTMLInputElement;

    expect(trigger.textContent).toContain('Apple');
    expect(hiddenInput?.value).toBe('Apple');

    fireEvent.change(searchInput, { target: { value: 'ch' } });
    expect(searchInput.value).toBe('ch');

    fireEvent.click(screen.getByRole('option', { name: /cherry/i }));
    expect(trigger.textContent).toContain('Cherry');
    expect(hiddenInput?.value).toBe('Cherry');
    expect(screen.queryByRole('searchbox')).toBeNull();

    fireEvent.reset(form);

    expect(trigger.textContent).toContain('Apple');
    expect(hiddenInput?.value).toBe('Apple');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  });

  it('keeps combobox state when native form reset is prevented', () => {
    render(
      <form
        data-testid="prevented-reset-form"
        onReset={event => {
          event.preventDefault();
        }}
      >
        <Combobox.Root
          items={fruitItems}
          defaultValue="Apple"
          itemToStringLabel={item => item}
          itemToStringValue={item => item}
          name="prevented_reset_fruit"
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
      </form>
    );

    const form = screen.getByTestId('prevented-reset-form');
    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const hiddenInput = document.querySelector<HTMLInputElement>(
      'input[name="prevented_reset_fruit"]'
    );

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /cherry/i }));
    expect(trigger.textContent).toContain('Cherry');
    expect(hiddenInput?.value).toBe('Cherry');

    fireEvent.reset(form);

    expect(trigger.textContent).toContain('Cherry');
    expect(hiddenInput?.value).toBe('Cherry');
  });

  it('emits form-reset changes for controlled values associated with external forms', () => {
    const handleValueChange = vi.fn();

    function ControlledResetCombobox() {
      const [value, setValue] = useState<string | null>('Cherry');

      return (
        <>
          <form
            id="controlled-reset-form"
            data-testid="controlled-reset-form"
          />
          <Combobox.Root
            items={fruitItems}
            defaultValue="Apple"
            value={value}
            onValueChange={(nextValue, details) => {
              handleValueChange(nextValue, details);
              setValue(nextValue);
            }}
            itemToStringLabel={item => item}
            itemToStringValue={item => item}
            name="controlled_external_fruit"
            form="controlled-reset-form"
          >
            <Combobox.Trigger aria-label="Fruit">
              <Combobox.Value placeholder="Choose fruit" />
            </Combobox.Trigger>
          </Combobox.Root>
        </>
      );
    }

    render(<ControlledResetCombobox />);

    const form = screen.getByTestId('controlled-reset-form');
    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const hiddenInput = document.querySelector<HTMLInputElement>(
      'input[name="controlled_external_fruit"]'
    );

    expect(trigger.textContent).toContain('Cherry');
    expect(hiddenInput?.value).toBe('Cherry');

    fireEvent.reset(form);

    expect(handleValueChange).toHaveBeenCalledWith(
      'Apple',
      expect.objectContaining({ reason: 'form-reset' })
    );
    expect(trigger.textContent).toContain('Apple');
    expect(hiddenInput?.value).toBe('Apple');
  });

  it('exposes read-only state to trigger and popup search input', () => {
    const onValueChange = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        defaultOpen
        readOnly
        onValueChange={onValueChange}
      >
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

    expect(
      screen
        .getByRole('combobox', { name: /fruit/i })
        .getAttribute('aria-readonly')
    ).toBe('true');
    expect(screen.getByRole('searchbox').getAttribute('aria-readonly')).toBe(
      'true'
    );

    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.getAttribute('aria-activedescendant')).toBe(null);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toBe(input);
  });

  it('reflects direct primitive input read-only props to ARIA', () => {
    render(
      <Combobox.Root items={fruitItems} defaultOpen>
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input placeholder="Search fruit" readOnly />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const input = screen.getByRole('searchbox');
    expect((input as HTMLInputElement).readOnly).toBe(true);
    expect(input.getAttribute('aria-readonly')).toBe('true');
  });

  it('uses root autocomplete as the primitive input default', () => {
    const AutoCompleteCombobox = ({
      inputAutoComplete,
    }: {
      inputAutoComplete?: string;
    }) => (
      <Combobox.Root items={fruitItems} defaultOpen autoComplete="off">
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input
                placeholder="Search fruit"
                autoComplete={inputAutoComplete}
              />
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
    const { rerender } = render(<AutoCompleteCombobox />);

    expect(
      screen.getByPlaceholderText('Search fruit').getAttribute('autocomplete')
    ).toBe('off');

    rerender(<AutoCompleteCombobox inputAutoComplete="new-password" />);

    expect(
      screen.getByPlaceholderText('Search fruit').getAttribute('autocomplete')
    ).toBe('new-password');
  });
});
