import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddNewButton from './AddNewButton';

describe('AddNewButton', () => {
  it('passes search term to onAddNew when clicked', () => {
    const onAddNew = vi.fn();

    const { container } = render(
      <AddNewButton
        searchTerm="Paracetamol"
        searchState="typing"
        onAddNew={onAddNew}
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();

    fireEvent.click(icon!);
    expect(onAddNew).toHaveBeenCalledWith('Paracetamol');
  });
});
