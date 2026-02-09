import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button';

describe('Dropdown Button', () => {
  it('renders text mode and handles interactions when enabled', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    render(
      <Button
        mode="text"
        displayText="Paracetamol"
        titleText="Paracetamol"
        isPlaceholder={false}
        isOpen={true}
        isClosing={false}
        isExpanded={false}
        hasError={false}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-slate-700');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'dropdown-options-list');

    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    fireEvent.focus(button);
    fireEvent.blur(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('does not bind interactive handlers in disabled text mode', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <Button
        mode="text"
        displayText="Disabled"
        isPlaceholder={true}
        isOpen={false}
        isClosing={false}
        isExpanded={false}
        hasError={false}
        disabled={true}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
        onFocus={vi.fn()}
        onBlur={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('renders input mode with error styling and expanded content classes', () => {
    render(
      <Button
        displayText="Error option"
        isPlaceholder={false}
        isOpen={false}
        isClosing={true}
        isExpanded={true}
        hasError={true}
        onClick={vi.fn()}
        onKeyDown={vi.fn()}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
        onFocus={vi.fn()}
        onBlur={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('items-start', 'border-danger');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).not.toHaveAttribute('aria-controls');
  });
});
