import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RandomItemFloatingButton } from './RandomItemFloatingButton';

const useRandomItemCreationMock = vi.hoisted(() => vi.fn());
const createRandomItemMock = vi.hoisted(() => vi.fn());

vi.mock('./useRandomItemCreation', () => ({
  useRandomItemCreation: useRandomItemCreationMock,
}));

describe('RandomItemFloatingButton', () => {
  beforeEach(() => {
    useRandomItemCreationMock.mockReset();
    createRandomItemMock.mockReset();

    useRandomItemCreationMock.mockReturnValue({
      createRandomItem: createRandomItemMock,
      isLoadingEntities: false,
      entitiesReady: true,
    });
  });

  it('does not render button when disabled but still passes enabled=false to hook', () => {
    const { container } = render(<RandomItemFloatingButton enabled={false} />);

    expect(useRandomItemCreationMock).toHaveBeenCalledWith({ enabled: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders enabled button and triggers random item creation on click', () => {
    render(<RandomItemFloatingButton creationOptions={{ enabled: true }} />);

    const button = screen.getByTitle('Tambah Item Acak');
    fireEvent.click(button);

    expect(useRandomItemCreationMock).toHaveBeenCalledWith({ enabled: true });
    expect(button).toBeEnabled();
    expect(createRandomItemMock).toHaveBeenCalledTimes(1);
  });

  it('disables action button while entities are loading', () => {
    useRandomItemCreationMock.mockReturnValue({
      createRandomItem: createRandomItemMock,
      isLoadingEntities: true,
      entitiesReady: false,
    });

    render(<RandomItemFloatingButton />);

    const button = screen.getByTitle('Tambah Item Acak');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(createRandomItemMock).not.toHaveBeenCalled();
  });
});
