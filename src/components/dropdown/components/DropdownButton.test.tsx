import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DropdownButton from './DropdownButton';

const useTextExpansionMock = vi.hoisted(() => vi.fn());
const buttonMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useTextExpansion', () => ({
  useTextExpansion: useTextExpansionMock,
}));

vi.mock('./button/Button', () => ({
  default: React.forwardRef((props: Record<string, unknown>, ref) => {
    buttonMock(props);
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        data-testid="inner-button"
        onClick={props.onClick as React.MouseEventHandler<HTMLButtonElement>}
        onKeyDown={
          props.onKeyDown as React.KeyboardEventHandler<HTMLButtonElement>
        }
        onMouseEnter={
          props.onMouseEnter as React.MouseEventHandler<HTMLButtonElement>
        }
        onMouseLeave={
          props.onMouseLeave as React.MouseEventHandler<HTMLButtonElement>
        }
        onFocus={props.onFocus as React.FocusEventHandler<HTMLButtonElement>}
        onBlur={props.onBlur as React.FocusEventHandler<HTMLButtonElement>}
      >
        {String(props.displayText)}
      </button>
    );
  }),
}));

describe('DropdownButton', () => {
  beforeEach(() => {
    useTextExpansionMock.mockReset();
    buttonMock.mockReset();
    useTextExpansionMock.mockReturnValue({
      isButtonTextExpanded: false,
    });
  });

  it('renders placeholder when selected option is empty', () => {
    const onClick = vi.fn();

    render(
      <DropdownButton
        isOpen={false}
        isClosing={false}
        hasError={false}
        onClick={onClick}
        onBlur={vi.fn()}
      />
    );

    expect(screen.getByTestId('inner-button')).toHaveTextContent('Pilih');
    expect(buttonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayText: 'Pilih',
        titleText: 'Pilih',
        isPlaceholder: true,
        isExpanded: false,
      })
    );

    fireEvent.click(screen.getByTestId('inner-button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards selected option text and blur handler to inner button', () => {
    const onBlur = vi.fn();
    const onKeyDown = vi.fn();
    useTextExpansionMock.mockReturnValue({
      isButtonTextExpanded: true,
    });

    render(
      <DropdownButton
        mode="text"
        selectedOption={{ id: '1', name: 'Paracetamol' }}
        placeholder="Select item"
        isOpen={true}
        isClosing={true}
        hasError={true}
        name="item"
        tabIndex={0}
        disabled={true}
        onClick={vi.fn()}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
    );

    expect(screen.getByTestId('inner-button')).toHaveTextContent('Paracetamol');
    expect(buttonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'text',
        displayText: 'Paracetamol',
        titleText: 'Paracetamol',
        isPlaceholder: false,
        isOpen: true,
        isClosing: true,
        hasError: true,
        name: 'item',
        tabIndex: 0,
        disabled: true,
      })
    );

    fireEvent.keyDown(screen.getByTestId('inner-button'), { key: 'Enter' });
    fireEvent.mouseEnter(screen.getByTestId('inner-button'));
    fireEvent.mouseLeave(screen.getByTestId('inner-button'));
    fireEvent.focus(screen.getByTestId('inner-button'));
    fireEvent.blur(screen.getByTestId('inner-button'));

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
