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
import Dropdown from './index';

function DropdownHarness() {
  const [persistedDropdownName, setPersistedDropdownName] = useState<
    string | null
  >(null);
  const [isAddNewModalOpen, setIsAddNewModalOpen] = useState(false);

  const clearPersistedDropdown = () => {
    setPersistedDropdownName(null);
  };

  return (
    <div>
      <Dropdown
        name="first_dropdown"
        value=""
        options={[
          { id: 'alpha', name: 'Alpha' },
          { id: 'beta', name: 'Beta' },
        ]}
        placeholder="Pilih Pertama"
        onChange={() => {}}
        onAddNew={() => {
          setPersistedDropdownName('first_dropdown');
          setIsAddNewModalOpen(true);
        }}
        persistOpen={persistedDropdownName === 'first_dropdown'}
        freezePersistedMenu={
          isAddNewModalOpen && persistedDropdownName === 'first_dropdown'
        }
        onPersistOpenClear={clearPersistedDropdown}
      />

      <Dropdown
        name="second_dropdown"
        value=""
        options={[
          { id: 'gamma', name: 'Gamma' },
          { id: 'delta', name: 'Delta' },
        ]}
        placeholder="Pilih Kedua"
        onChange={() => {}}
        searchList={false}
        onPersistOpenClear={clearPersistedDropdown}
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

function KeyboardDropdownHarness() {
  const [value, setValue] = useState('alpha');

  return (
    <Dropdown
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

function LargeDropdownHarness() {
  const [value, setValue] = useState('');
  const options = Array.from({ length: 250 }, (_, index) => ({
    id: `item-${index + 1}`,
    name: `Item ${index + 1}`,
  }));

  return (
    <Dropdown
      name="large_dropdown"
      value={value}
      options={options}
      placeholder="Pilih Banyak"
      onChange={setValue}
    />
  );
}

function SelectedLargeDropdownHarness() {
  const [value, setValue] = useState('item-40');
  const options = Array.from({ length: 250 }, (_, index) => ({
    id: `item-${index + 1}`,
    name: `Item ${index + 1}`,
  }));

  return (
    <Dropdown
      name="selected_large_dropdown"
      value={value}
      options={options}
      placeholder="Pilih Banyak"
      onChange={setValue}
    />
  );
}

function CheckboxDropdownHarness() {
  const [value, setValue] = useState<string[]>([]);

  return (
    <Dropdown
      name="checkbox_dropdown"
      value={value}
      options={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Checkbox"
      onChange={setValue}
      withCheckbox
    />
  );
}

function HoverDetailDropdownHarness({
  onFetchHoverDetail,
}: {
  onFetchHoverDetail: (optionId: string) => Promise<{
    id: string;
    name: string;
    description: string;
  }>;
}) {
  return (
    <Dropdown
      name="hover_detail_dropdown"
      value=""
      options={[
        { id: 'alpha', name: 'Alpha', description: 'Ringkasan awal' },
        { id: 'beta', name: 'Beta' },
      ]}
      placeholder="Pilih Hover"
      onChange={() => {}}
      enableHoverDetail
      hoverDetailDelay={800}
      onFetchHoverDetail={onFetchHoverDetail}
    />
  );
}

describe('Dropdown', () => {
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
    render(<DropdownHarness />);

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
    render(<DropdownHarness />);

    const trigger = screen.getByRole('combobox', { name: 'Pilih Pertama' });
    act(() => {
      fireEvent.click(trigger);
      vi.advanceTimersByTime(200);
    });

    const searchInput = screen.getByPlaceholderText('Cari...');
    expect(document.activeElement).not.toBe(searchInput);
  });

  it('keeps arrow key navigation on the trigger after opening', () => {
    render(<KeyboardDropdownHarness />);

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

  it('routes printable trigger key presses to the search input when open', () => {
    render(<DropdownHarness />);

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
    render(<LargeDropdownHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Banyak' }));
      vi.advanceTimersByTime(200);
    });

    const renderedOptions = screen.queryAllByRole('option');
    expect(renderedOptions.length).toBeGreaterThan(0);
    expect(renderedOptions.length).toBeLessThan(250);
    expect(screen.queryByRole('option', { name: 'Item 250' })).toBeNull();
  });

  it('does not force the list back to the selected option while scrolling', () => {
    render(<SelectedLargeDropdownHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Item 40' }));
      vi.advanceTimersByTime(200);
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox.scrollTop).toBe(1404);
    expect(
      screen
        .getByRole('option', { name: 'Item 40' })
        .getAttribute('data-dropdown-option-highlighted')
    ).not.toBeNull();

    act(() => {
      listbox.scrollTop = 720;
      fireEvent.scroll(listbox);
      vi.advanceTimersByTime(20);
    });

    expect(listbox.scrollTop).toBe(720);
  });

  it('keeps option highlight active after the pointer leaves an option', () => {
    render(<DropdownHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Pertama' }));
      vi.advanceTimersByTime(200);
    });

    const betaOption = screen.getByRole('option', { name: 'Beta' });
    act(() => {
      fireEvent.mouseEnter(betaOption);
      fireEvent.mouseLeave(betaOption);
    });

    expect(
      betaOption.getAttribute('data-dropdown-option-highlighted')
    ).not.toBeNull();
  });

  it('opens add-new modal when the empty-search plus button is clicked', () => {
    render(<DropdownHarness />);

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

  it('keeps checkbox dropdown open while accumulating multiple values', () => {
    render(<CheckboxDropdownHarness />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Checkbox' }));
      vi.advanceTimersByTime(200);
    });

    act(() => {
      fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    });

    act(() => {
      fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
    });

    expect(
      screen.getByRole('combobox', { name: /Alpha, Beta/ })
    ).not.toBeNull();
    expect(screen.getByPlaceholderText('Cari...')).not.toBeNull();
  });

  it('shows fetched hover detail data for options', async () => {
    const onFetchHoverDetail = vi.fn(async (optionId: string) => ({
      id: optionId,
      name: 'Alpha',
      description: 'Detail hasil fetch',
    }));

    render(
      <HoverDetailDropdownHarness onFetchHoverDetail={onFetchHoverDetail} />
    );

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Hover' }));
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      fireEvent.mouseEnter(screen.getByRole('option', { name: 'Alpha' }));
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(onFetchHoverDetail).toHaveBeenCalledWith('alpha');
    expect(screen.getByText('Detail hasil fetch')).not.toBeNull();
  });

  it('updates hover detail immediately after the popup is visible', async () => {
    const onFetchHoverDetail = vi.fn(async (optionId: string) => ({
      id: optionId,
      name: optionId === 'alpha' ? 'Alpha' : 'Beta',
      description:
        optionId === 'alpha' ? 'Detail Alpha fetched' : 'Detail Beta fetched',
    }));

    render(
      <HoverDetailDropdownHarness onFetchHoverDetail={onFetchHoverDetail} />
    );

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Pilih Hover' }));
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      fireEvent.mouseEnter(screen.getByRole('option', { name: 'Alpha' }));
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.mouseEnter(screen.getByRole('option', { name: 'Beta' }));
      await Promise.resolve();
    });

    expect(onFetchHoverDetail).toHaveBeenCalledWith('beta');
    expect(screen.getByText('Detail Beta fetched')).not.toBeNull();
  });
});
