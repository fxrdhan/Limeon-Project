import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import SearchBar from './SearchBar';

const ControlledSearchBar = () => {
  const [value, setValue] = useState('');

  return (
    <SearchBar
      value={value}
      onChange={event => setValue(event.target.value)}
      placeholder="Cari data"
    />
  );
};

describe('SearchBar auto type focus', () => {
  it('focuses and types a printable key when no editable element is focused', () => {
    render(<ControlledSearchBar />);

    const searchInput = screen.getByPlaceholderText(
      'Cari data'
    ) as HTMLInputElement;

    fireEvent.keyDown(document, { key: 'm' });

    expect(document.activeElement).toBe(searchInput);
    expect(searchInput.value).toBe('m');
  });

  it('does not steal typing from another input', () => {
    render(
      <>
        <input aria-label="Input lain" />
        <ControlledSearchBar />
      </>
    );

    const otherInput = screen.getByLabelText('Input lain');
    const searchInput = screen.getByPlaceholderText(
      'Cari data'
    ) as HTMLInputElement;

    otherInput.focus();
    fireEvent.keyDown(otherInput, { key: 'm' });

    expect(document.activeElement).toBe(otherInput);
    expect(searchInput.value).toBe('');
  });
});
