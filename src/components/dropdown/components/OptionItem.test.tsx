import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OptionItem from './OptionItem';

const useDropdownContextMock = vi.hoisted(() => vi.fn());
const optionRowMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useDropdownContext', () => ({
  useDropdownContext: useDropdownContextMock,
}));

vi.mock('./options/OptionRow', () => ({
  default: (props: Record<string, unknown>) => {
    optionRowMock(props);
    return <div data-testid="option-row" />;
  },
}));

describe('OptionItem', () => {
  beforeEach(() => {
    useDropdownContextMock.mockReset();
    optionRowMock.mockReset();
    useDropdownContextMock.mockReturnValue({
      withRadio: true,
      withCheckbox: false,
      isKeyboardNavigation: true,
      portalStyle: { width: '320px' },
      onSelect: vi.fn(),
      onHoverDetailShow: vi.fn(),
      onHoverDetailHide: vi.fn(),
    });
  });

  it('forwards context and local props into OptionRow', () => {
    const dropdownMenuRef = {
      current: document.createElement('div'),
    };

    render(
      <OptionItem
        option={{ id: '1', name: 'Paracetamol' }}
        index={2}
        isSelected={true}
        isHighlighted={false}
        isExpanded={true}
        onHighlight={vi.fn()}
        dropdownMenuRef={dropdownMenuRef}
      />
    );

    expect(optionRowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        option: { id: '1', name: 'Paracetamol' },
        index: 2,
        isSelected: true,
        isHighlighted: false,
        isExpanded: true,
        isKeyboardNavigation: true,
        portalWidth: '320px',
        withRadio: true,
        withCheckbox: false,
        onHoverDetailShow: expect.any(Function),
        onHoverDetailHide: expect.any(Function),
      })
    );
  });
});
