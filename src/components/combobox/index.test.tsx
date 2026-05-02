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
import type { ComboboxOpenChangeDetails } from '../../types';
import Combobox from './index';

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
      onInputValueChange={(nextInputValue: string) => {
        onInputValueChange(nextInputValue);
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
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
    expect(searchInput.getAttribute('aria-controls')).toBe(listbox.id);
    expect(trigger.getAttribute('aria-activedescendant')).toBe(betaOption.id);
    expect(searchInput.getAttribute('aria-activedescendant')).toBe(
      betaOption.id
    );
    expect(betaOption.tabIndex).toBe(-1);
    expect(betaOption.getAttribute('data-highlighted')).toBe('');
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

    expect(onOpenChange).toHaveBeenCalledWith(true, {
      reason: 'trigger-press',
    });
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

    expect(onInputValueChange).toHaveBeenCalledWith('be');
    expect((searchInput as HTMLInputElement).value).toBe('be');
  });

  it('uses a native required form control for empty required multi-selects', () => {
    render(<RequiredCheckboxComboboxHarness />);

    const nativeInput = document.querySelector<HTMLInputElement>(
      'input[name="required_multi_dropdown"]'
    );

    expect(nativeInput?.type).toBe('text');
    expect(nativeInput?.required).toBe(true);
    expect(nativeInput?.value).toBe('');
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
