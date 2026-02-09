import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OptionRow from './OptionRow';

const shouldTruncateTextMock = vi.hoisted(() => vi.fn());
const truncateTextMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/text', () => ({
  shouldTruncateText: shouldTruncateTextMock,
  truncateText: truncateTextMock,
}));

vi.mock('./RadioIndicator', () => ({
  default: ({ isSelected }: { isSelected: boolean }) => (
    <span>{isSelected ? 'radio-selected' : 'radio-unselected'}</span>
  ),
}));

vi.mock('./CheckboxIndicator', () => ({
  default: ({ isSelected }: { isSelected: boolean }) => (
    <span>{isSelected ? 'checkbox-selected' : 'checkbox-unselected'}</span>
  ),
}));

const renderOptionRow = (
  props: Partial<React.ComponentProps<typeof OptionRow>> = {}
) => {
  const onSelect = vi.fn();
  const onHighlight = vi.fn();
  const onHoverDetailShow = vi.fn().mockResolvedValue(undefined);
  const onHoverDetailHide = vi.fn();

  render(
    <OptionRow
      option={{
        id: 'opt-1',
        name: 'Paracetamol Extra Long Name',
        code: 'PRC-1',
      }}
      index={0}
      isSelected={false}
      isHighlighted={false}
      isKeyboardNavigation={false}
      onSelect={onSelect}
      onHighlight={onHighlight}
      dropdownMenuRef={{ current: document.createElement('div') }}
      onHoverDetailShow={onHoverDetailShow}
      onHoverDetailHide={onHoverDetailHide}
      {...props}
    />
  );

  return {
    onSelect,
    onHighlight,
    onHoverDetailShow,
    onHoverDetailHide,
  };
};

describe('OptionRow', () => {
  it('truncates text when needed and triggers select/highlight/hover detail callbacks', async () => {
    shouldTruncateTextMock.mockReturnValue(true);
    truncateTextMock.mockReturnValue('Paracetamol...');

    const { onSelect, onHighlight, onHoverDetailShow, onHoverDetailHide } =
      renderOptionRow({
        isSelected: true,
        isHighlighted: true,
        withRadio: true,
        portalWidth: '260px',
      });

    const optionButton = screen.getByRole('option');
    expect(screen.getByText('Paracetamol...')).toBeInTheDocument();
    expect(screen.getByText('radio-selected')).toBeInTheDocument();
    expect(optionButton).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTitle('Paracetamol Extra Long Name')
    ).toBeInTheDocument();

    fireEvent.click(optionButton);
    expect(onSelect).toHaveBeenCalledWith('opt-1');

    fireEvent.focus(optionButton);
    expect(onHighlight).toHaveBeenCalledWith(0);

    fireEvent.mouseEnter(optionButton);
    await Promise.resolve();

    expect(onHighlight).toHaveBeenCalledWith(0);
    expect(onHoverDetailShow).toHaveBeenCalledWith(
      'opt-1',
      optionButton,
      expect.objectContaining({
        id: 'opt-1',
        name: 'Paracetamol Extra Long Name',
        code: 'PRC-1',
      })
    );

    fireEvent.mouseLeave(optionButton);
    expect(onHoverDetailHide).toHaveBeenCalledTimes(1);
  });

  it('shows full text when expanded and ignores hover handlers in keyboard navigation mode', async () => {
    shouldTruncateTextMock.mockReturnValue(true);
    truncateTextMock.mockReturnValue('Ignored truncate');

    const { onHighlight, onHoverDetailShow, onHoverDetailHide } =
      renderOptionRow({
        isKeyboardNavigation: true,
        isExpanded: true,
        withCheckbox: true,
        portalWidth: 300,
      });

    const optionButton = screen.getByRole('option');
    expect(screen.getByText('Paracetamol Extra Long Name')).toBeInTheDocument();
    expect(screen.getByText('checkbox-unselected')).toBeInTheDocument();
    expect(
      screen.queryByTitle('Paracetamol Extra Long Name')
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(optionButton);
    fireEvent.mouseLeave(optionButton);
    await Promise.resolve();

    expect(onHighlight).not.toHaveBeenCalled();
    expect(onHoverDetailShow).not.toHaveBeenCalled();
    expect(onHoverDetailHide).not.toHaveBeenCalled();
  });
});
