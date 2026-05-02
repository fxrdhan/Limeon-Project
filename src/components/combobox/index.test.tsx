import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type {
  ComboboxInputValueChangeDetails,
  ComboboxOpenChangeDetails,
  ComboboxProps,
} from '../../types';
import FormField from '../form-field';
import Combobox from './index';
import { ComboboxPopup, ComboboxTrigger } from './exports';

function ComboboxHarness() {
  const [persistedComboboxName, setPersistedComboboxName] = useState<
    string | null
  >(null);
  const [isAddNewModalOpen, setIsAddNewModalOpen] = useState(false);

  const clearPersistedCombobox = () => {
    setPersistedComboboxName(null);
  };

  return (
    <div>
      <Combobox
        name="first_dropdown"
        value=""
        options={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'beta', name: 'Beta' },
        ]}
        placeholder="Pilih Pertama"
        onChange={() => {}}
        onAddNew={() => {
          setPersistedComboboxName('first_dropdown');
          setIsAddNewModalOpen(true);
        }}
        persistOpen={persistedComboboxName === 'first_dropdown'}
        freezePersistedMenu={
          isAddNewModalOpen && persistedComboboxName === 'first_dropdown'
        }
        onPersistOpenClear={clearPersistedCombobox}
      />

      <Combobox
        name="second_dropdown"
        value=""
        options={[
          { id: 'gamma', name: 'Gamma' },
          { id: 'delta', name: 'Delta' },
        ]}
        placeholder="Pilih Kedua"
        onChange={() => {}}
        searchList={false}
        onPersistOpenClear={clearPersistedCombobox}
      />

      {isAddNewModalOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Add new modal">
          <button type="button" onClick={() => setIsAddNewModalOpen(false)}>
            Tutup modal add new
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KeyboardComboboxHarness() {
  const [value, setValue] = useState('alpha');

  return (
    <Combobox
      name="keyboard_dropdown"
      value={value}
      options={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Keyboard"
      onChange={setValue}
    />
  );
}

function LargeComboboxHarness() {
  const [value, setValue] = useState('');
  const options = Array.from({ length: 250 }, (_, index) => ({
    id: `item-${index + 1}`,
    name: `Item ${index + 1}`,
  }));

  return (
    <Combobox
      name="large_dropdown"
      value={value}
      options={options}
      placeholder="Pilih Banyak"
      onChange={setValue}
    />
  );
}

function ControlledComboboxHarness({
  onOpenChange,
  onInputValueChange,
}: {
  onOpenChange: React.ComponentProps<typeof Combobox>['onOpenChange'];
  onInputValueChange: NonNullable<
    React.ComponentProps<typeof Combobox>['onInputValueChange']
  >;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <Combobox
      name="controlled_dropdown"
      value="alpha"
      open={open}
      onOpenChange={(nextOpen: boolean, details: ComboboxOpenChangeDetails) => {
        onOpenChange?.(nextOpen, details);
        setOpen(nextOpen);
      }}
      inputValue={inputValue}
      onInputValueChange={(
        nextInputValue: string,
        details: ComboboxInputValueChangeDetails
      ) => {
        onInputValueChange(nextInputValue, details);
        setInputValue(nextInputValue);
      }}
      highlightedValue="beta"
      options={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Controlled"
      onChange={() => {}}
    />
  );
}

function RequiredCheckboxComboboxHarness() {
  return (
    <Combobox
      name="required_multi_dropdown"
      value={[]}
      options={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Wajib"
      onChange={() => {}}
      withCheckbox
      required
    />
  );
}

function LabelledComboboxHarness() {
  return (
    <FormField label="Supplier">
      <Combobox
        name="supplier_id"
        value=""
        options={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'beta', name: 'Beta' },
        ]}
        placeholder="-- Pilih Supplier --"
        onChange={() => {}}
      />
    </FormField>
  );
}

function CompoundComboboxHarness() {
  const [value, setValue] = useState('');

  return (
    <Combobox
      name="compound_dropdown"
      value={value}
      options={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Compound"
      onChange={setValue}
    >
      <ComboboxTrigger />
      <ComboboxPopup />
    </Combobox>
  );
}

function RenderPartComboboxHarness() {
  const [value, setValue] = useState('');

  return (
    <Combobox
      name="render_part_dropdown"
      value={value}
      options={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Render Part"
      onChange={setValue}
    >
      <ComboboxTrigger
        render={(props, state) => (
          <button
            {...props}
            data-rendered-trigger=""
            data-open-state={state.open ? 'open' : 'closed'}
          />
        )}
      />
      <ComboboxPopup
        render={(props, state) => (
          <div
            {...props}
            data-rendered-popup=""
            data-open-state={state.open ? 'open' : 'closed'}
          />
        )}
      />
    </Combobox>
  );
}

describe('Combobox', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => null
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('closes a pinned dropdown when another dropdown opens', () => {
    render(<ComboboxHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Pertama' }));
    });

    const searchInput = screen.getByPlaceholderText('Cari...');
    act(() => {
      fireEvent.change(searchInput, {
        target: { value: 'Item yang tidak ada' },
      });
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    });

    expect(
      screen.getByRole('dialog', { name: 'Add new modal' })
    ).not.toBeNull();

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Tutup modal add new' })
      );
    });

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Kedua' }));
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByPlaceholderText('Cari...')).toBeNull();
  });

  it('does not focus the dropdown search input when opened', () => {
    render(<ComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: 'Pilih Pertama' });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    const searchInput = screen.getByPlaceholderText('Cari...');
    expect(document.activeElement).not.toBe(searchInput);
  });

  it('wires trigger, search input, and listbox with combobox semantics', () => {
    render(<KeyboardComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });

    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
    });

    const popup = screen.getByRole('dialog');
    const listbox = screen.getByRole('listbox', { name: 'Daftar pilihan' });
    const searchInput = screen.getByRole('combobox', {
      name: 'Cari pilihan',
    });
    const betaOption = screen.getByRole('option', { name: 'Beta' });

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
    expect(searchInput.getAttribute('aria-controls')).toBe(listbox.id);
    expect(trigger.getAttribute('aria-activedescendant')).toBe(betaOption.id);
    expect(searchInput.getAttribute('aria-activedescendant')).toBe(
      betaOption.id
    );
    expect(betaOption.tabIndex).toBe(-1);
    expect(betaOption.getAttribute('data-highlighted')).toBe('');
  });

  it('uses listbox popup semantics when no search input is rendered', () => {
    render(
      <Combobox
        name="enum_dropdown"
        value="alpha"
        options={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'beta', name: 'Beta' },
        ]}
        placeholder="Pilih Enum"
        onChange={() => {}}
        searchList={false}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    const listbox = screen.getByRole('listbox', { name: 'Daftar pilihan' });
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens from the collapsed trigger with ArrowDown', () => {
    render(<KeyboardComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      vi.advanceTimersByTime(200);
    });

    const popup = screen.getByRole('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
  });

  it('keeps arrow key navigation on the trigger after opening', () => {
    render(<KeyboardComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      trigger.focus();
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    });

    expect(screen.getByRole('combobox', { name: /Beta/ })).not.toBeNull();
  });

  it('supports Home and End keyboard navigation while open', () => {
    render(<KeyboardComboboxHarness />);

    const initialTrigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(initialTrigger);
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(initialTrigger, { key: 'End', code: 'End' });
      fireEvent.keyDown(initialTrigger, { key: 'Enter', code: 'Enter' });
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const betaTrigger = screen.getByRole('combobox', { name: /Beta/ });
    act(() => {
      fireEvent.click(betaTrigger);
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(betaTrigger, { key: 'Home', code: 'Home' });
      fireEvent.keyDown(betaTrigger, { key: 'Enter', code: 'Enter' });
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByRole('combobox', { name: /Alpha/ })).not.toBeNull();
  });

  it('mirrors the selected value to a hidden form input', () => {
    render(<KeyboardComboboxHarness />);

    const getHiddenInput = () =>
      document.querySelector<HTMLInputElement>(
        'input[name="keyboard_dropdown"]'
      );

    expect(getHiddenInput()?.value).toBe('alpha');

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    });

    expect(getHiddenInput()?.value).toBe('beta');
  });

  it('supports controlled open, input, and highlighted item state', () => {
    const onOpenChange = vi.fn();
    const onInputValueChange = vi.fn();
    render(
      <ControlledComboboxHarness
        onOpenChange={onOpenChange}
        onInputValueChange={onInputValueChange}
      />
    );

    const trigger = screen.getByRole('combobox', {
      name: /Alpha/,
    });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        reason: 'trigger-press',
        event: expect.any(MouseEvent),
        cancel: expect.any(Function),
        allowPropagation: expect.any(Function),
        isCanceled: false,
        isPropagationAllowed: false,
      })
    );
    expect(
      screen
        .getByRole('option', { name: 'Beta' })
        .getAttribute('data-highlighted')
    ).toBe('');

    const searchInput = screen.getByRole('combobox', {
      name: 'Cari pilihan',
    });
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'be' } });
    });

    expect(onInputValueChange).toHaveBeenCalledWith(
      'be',
      expect.objectContaining({
        reason: 'input-change',
        event: expect.any(Event),
      })
    );
    expect((searchInput as HTMLInputElement).value).toBe('be');
  });

  it('lets consumers cancel uncontrolled open changes', () => {
    const onOpenChange = vi.fn(
      (_nextOpen: boolean, details: ComboboxOpenChangeDetails) => {
        details.cancel();
      }
    );

    render(
      <Combobox
        name="cancel_open_dropdown"
        value=""
        options={[{ id: 'alpha', name: 'Alpha' }]}
        placeholder="Pilih Cancel Open"
        onChange={() => {}}
        onOpenChange={onOpenChange}
      />
    );

    act(() => {
      fireEvent.click(
        screen.getByRole('combobox', { name: 'Pilih Cancel Open' })
      );
      vi.advanceTimersByTime(200);
    });

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: 'trigger-press', isCanceled: true })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('passes cancelable value-change details and keeps the popup open when canceled', () => {
    const onChange = vi.fn(
      (
        _nextValue: string,
        details: Parameters<ComboboxProps['onChange']>[1]
      ) => {
        details.cancel();
      }
    );

    render(
      <Combobox
        name="cancel_value_dropdown"
        value="alpha"
        options={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'beta', name: 'Beta' },
        ]}
        placeholder="Pilih Cancel Value"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
      vi.advanceTimersByTime(200);
    });

    expect(onChange).toHaveBeenCalledWith(
      'beta',
      expect.objectContaining({ reason: 'item-press', isCanceled: true })
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Alpha/ })).toBeTruthy();
  });

  it('uses a native required form control for empty required multi-selects', () => {
    render(<RequiredCheckboxComboboxHarness />);

    const nativeInput = document.querySelector<HTMLInputElement>(
      'input[name="required_multi_dropdown"]'
    );

    expect(nativeInput?.type).toBe('text');
    expect(nativeInput?.required).toBe(true);
    expect(nativeInput?.readOnly).toBe(false);
    expect(nativeInput?.willValidate).toBe(true);
    expect(nativeInput?.validity.valueMissing).toBe(true);
    expect(nativeInput?.checkValidity()).toBe(false);
    expect(nativeInput?.value).toBe('');
  });

  it('uses the field label as the stable accessible combobox name', () => {
    render(<LabelledComboboxHarness />);

    const trigger = screen.getByRole('combobox', {
      name: /Supplier/,
    });

    expect(trigger.getAttribute('aria-labelledby')).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBeNull();
  });

  it('supports Base UI-like compound trigger and popup parts', () => {
    render(<CompoundComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: 'Pilih Compound' });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    expect(
      screen.getByRole('dialog', { name: 'Pilih Compound pilihan' })
    ).toBeTruthy();
  });

  it('supports render props on Base UI-like compound parts', () => {
    render(<RenderPartComboboxHarness />);

    const trigger = screen.getByRole('combobox', {
      name: 'Pilih Render Part',
    });

    expect(trigger.getAttribute('data-rendered-trigger')).toBe('');
    expect(trigger.getAttribute('data-open-state')).toBe('closed');

    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    expect(trigger.getAttribute('data-open-state')).toBe('open');
    expect(document.querySelector('[data-rendered-popup]')).toBeTruthy();
  });

  it('stops Escape key propagation unless the event details allow it', () => {
    const onParentKeyDown = vi.fn();

    render(
      <div role="presentation" onKeyDown={onParentKeyDown}>
        <Combobox
          name="escape_dropdown"
          value="alpha"
          options={[
            { id: 'alpha', name: 'Alpha' },
            { id: 'beta', name: 'Beta' },
          ]}
          placeholder="Pilih Escape"
          onChange={() => {}}
        />
      </div>
    );

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });

    expect(onParentKeyDown).not.toHaveBeenCalled();
  });

  it('allows Escape key propagation when requested from open-change details', () => {
    const onParentKeyDown = vi.fn();

    render(
      <div role="presentation" onKeyDown={onParentKeyDown}>
        <Combobox
          name="escape_allow_dropdown"
          value="alpha"
          options={[
            { id: 'alpha', name: 'Alpha' },
            { id: 'beta', name: 'Beta' },
          ]}
          placeholder="Pilih Escape Allow"
          onChange={() => {}}
          onOpenChange={(
            _nextOpen: boolean,
            details: ComboboxOpenChangeDetails
          ) => {
            if (details.reason === 'escape-key') {
              details.allowPropagation();
            }
          }}
        />
      </div>
    );

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });

    expect(onParentKeyDown).toHaveBeenCalledTimes(1);
  });

  it('closes on Tab without blocking browser focus navigation', () => {
    render(<KeyboardComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      trigger.focus();
      vi.advanceTimersByTime(200);
    });

    const wasNotPrevented = fireEvent.keyDown(trigger, {
      key: 'Tab',
      code: 'Tab',
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(wasNotPrevented).toBe(true);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('routes printable trigger key presses to the search input when open', () => {
    render(<ComboboxHarness />);

    const trigger = screen.getByRole('combobox', { name: 'Pilih Pertama' });
    act(() => {
      fireEvent.click(trigger);
      trigger.focus();
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(trigger, { key: 'b', code: 'KeyB' });
    });

    const searchInput = screen.getByPlaceholderText('Cari...');
    expect((searchInput as HTMLInputElement).value).toBe('b');
    expect(document.activeElement).toBe(searchInput);
  });

  it('virtualizes large option lists instead of rendering every option', () => {
    render(<LargeComboboxHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Banyak' }));
      vi.advanceTimersByTime(200);
    });

    const renderedOptions = screen.queryAllByRole('option');
    expect(renderedOptions.length).toBeGreaterThan(0);
    expect(renderedOptions.length).toBeLessThan(250);
    expect(screen.queryByRole('option', { name: 'Item 250' })).toBeNull();
  });

  it('opens add-new modal when the empty-search plus button is clicked', () => {
    render(<ComboboxHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Pertama' }));
    });

    const searchInput = screen.getByPlaceholderText('Cari...');
    act(() => {
      fireEvent.change(searchInput, {
        target: { value: 'Item yang tidak ada' },
      });
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.mouseDown(
        screen.getByRole('button', { name: 'Tambah data baru' })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Tambah data baru' }));
    });

    expect(
      screen.getByRole('dialog', { name: 'Add new modal' })
    ).not.toBeNull();
  });
});
