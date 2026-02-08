import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BadgeConfig } from '../types/badge';
import Badge from './Badge';

const validateFilterValueMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/validationUtils', () => ({
  validateFilterValue: validateFilterValueMock,
}));

const buildConfig = (partial: Partial<BadgeConfig> = {}): BadgeConfig => ({
  id: 'badge-1',
  type: 'value',
  label: '1000',
  canClear: true,
  onClear: vi.fn(),
  canEdit: true,
  onEdit: vi.fn(),
  canInsert: false,
  onInsert: vi.fn(),
  onEditComplete: vi.fn(),
  onValueChange: vi.fn(),
  editingValue: '1000',
  columnType: 'currency',
  ...partial,
});

describe('Badge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    validateFilterValueMock.mockReset();
    validateFilterValueMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('formats currency values when not editing', () => {
    render(<Badge config={buildConfig()} />);
    expect(screen.getByText('Rp 1.000')).toBeInTheDocument();
  });

  it('triggers onEdit from clickable label when editable', () => {
    const onEdit = vi.fn();
    render(<Badge config={buildConfig({ onEdit })} />);

    fireEvent.click(screen.getByText('Rp 1.000'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('handles inline edit keyboard shortcuts', () => {
    const onEditComplete = vi.fn();
    const onNavigateEdit = vi.fn();
    const onFocusInput = vi.fn();

    render(
      <Badge
        config={buildConfig({
          isEditing: true,
          editingValue: '120',
          onEditComplete,
          onNavigateEdit,
          onFocusInput,
        })}
      />
    );

    const input = screen.getByDisplayValue('120');

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(input, { key: 'Delete' });
    fireEvent.keyDown(input, { key: 'e', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'E', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(input, { key: 'i', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'd', ctrlKey: true });

    expect(onEditComplete).toHaveBeenCalledWith('120');
    expect(onEditComplete).toHaveBeenCalledWith('');
    expect(onNavigateEdit).toHaveBeenCalledWith('left');
    expect(onNavigateEdit).toHaveBeenCalledWith('right');
    expect(onFocusInput).toHaveBeenCalledTimes(1);
  });

  it('auto-triggers invalid value feedback and edit entry once', () => {
    const onEdit = vi.fn();
    const onInvalidValue = vi.fn();
    validateFilterValueMock.mockReturnValue(false);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    render(
      <Badge
        config={buildConfig({
          type: 'value',
          label: 'invalid',
          onEdit,
          onInvalidValue,
          isEditing: false,
        })}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(onInvalidValue).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('blocks blur completion when invalid and allows completion when valid', () => {
    const onEditComplete = vi.fn();
    const { rerender } = render(
      <Badge
        config={buildConfig({
          isEditing: true,
          editingValue: 'invalid',
          onEditComplete,
        })}
      />
    );

    validateFilterValueMock.mockReturnValue(false);
    fireEvent.blur(screen.getByDisplayValue('invalid'));
    expect(onEditComplete).not.toHaveBeenCalled();

    validateFilterValueMock.mockReturnValue(true);
    rerender(
      <Badge
        config={buildConfig({
          isEditing: true,
          editingValue: 'valid',
          onEditComplete,
        })}
      />
    );
    fireEvent.blur(screen.getByDisplayValue('valid'));
    expect(onEditComplete).toHaveBeenCalledWith('valid');
  });

  it('supports clear and insert actions when buttons are visible', () => {
    const onClear = vi.fn();
    const onInsert = vi.fn();
    const onHoverChange = vi.fn();

    const config = buildConfig({
      canEdit: false,
      canInsert: true,
      onClear,
      onInsert,
      isSelected: true,
      onHoverChange,
    });

    const { container } = render(<Badge config={config} />);
    const root = container.querySelector('[data-selected]');
    expect(root).not.toBeNull();

    fireEvent.mouseEnter(root as HTMLElement);
    fireEvent.mouseLeave(root as HTMLElement);

    const insertButton = screen.getByTitle('Tambah kondisi');
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(insertButton);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onHoverChange).toHaveBeenCalled();
  });
});
