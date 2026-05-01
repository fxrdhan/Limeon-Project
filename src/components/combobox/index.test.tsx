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
      fireEvent.click(screen.getByRole('button', { name: 'Pilih Pertama' }));
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
      fireEvent.click(screen.getByRole('button', { name: 'Pilih Kedua' }));
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByPlaceholderText('Cari...')).toBeNull();
  });

  it('does not focus the dropdown search input when opened', () => {
    render(<ComboboxHarness />);

    const trigger = screen.getByRole('button', { name: 'Pilih Pertama' });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    const searchInput = screen.getByPlaceholderText('Cari...');
    expect(document.activeElement).not.toBe(searchInput);
  });

  it('keeps arrow key navigation on the trigger after opening', () => {
    render(<KeyboardComboboxHarness />);

    const trigger = screen.getByRole('button', { name: /Alpha/ });
    act(() => {
      fireEvent.click(trigger);
      trigger.focus();
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    });

    expect(screen.getByRole('button', { name: /Beta/ })).not.toBeNull();
  });

  it('routes printable trigger key presses to the search input when open', () => {
    render(<ComboboxHarness />);

    const trigger = screen.getByRole('button', { name: 'Pilih Pertama' });
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
      fireEvent.click(screen.getByRole('button', { name: 'Pilih Banyak' }));
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
      fireEvent.click(screen.getByRole('button', { name: 'Pilih Pertama' }));
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
