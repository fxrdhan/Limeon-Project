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

    expect(screen.getByText('Tidak ada pilihan yang sesuai')).not.toBeNull();

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
    expect(screen.getByText('Gamma')).not.toBeNull();
  });
});
