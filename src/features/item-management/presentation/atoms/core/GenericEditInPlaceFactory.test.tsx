import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  GenericEditInPlace,
  type EditInPlaceConfig,
} from './GenericEditInPlaceFactory';

const config: EditInPlaceConfig = {
  label: 'Margin',
  inputType: 'number',
  display: {
    formatter: value => `${value as number}%`,
  },
};

const renderEditor = ({
  disabled = false,
  onStartEdit = vi.fn(),
}: {
  disabled?: boolean;
  onStartEdit?: () => void;
} = {}) => {
  render(
    <GenericEditInPlace
      isEditing={false}
      value={25}
      inputValue="25"
      tabIndex={3}
      onStartEdit={onStartEdit}
      onStopEdit={vi.fn()}
      onChange={vi.fn()}
      onKeyDown={vi.fn()}
      config={config}
      disabled={disabled}
    />
  );

  return { onStartEdit };
};

describe('GenericEditInPlace', () => {
  it('starts editing from the display button with keyboard when enabled', () => {
    const { onStartEdit } = renderEditor();

    const displayButton = screen.getByRole('button', { name: /25%/ });

    expect(displayButton.getAttribute('tabindex')).toBe('3');

    fireEvent.keyDown(displayButton, { key: 'Enter' });

    expect(onStartEdit).toHaveBeenCalledTimes(1);
  });

  it('does not expose a disabled display value as an interactive button', () => {
    const { onStartEdit } = renderEditor({ disabled: true });

    const displayValue = screen.getByText('25%');

    expect(screen.queryByRole('button')).toBeNull();
    expect(displayValue.closest('[tabindex]')).toBeNull();

    fireEvent.click(displayValue);

    expect(onStartEdit).not.toHaveBeenCalled();
  });
});
