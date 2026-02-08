import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemModalContainer from './ItemModalContainer';

const useItemModalMock = vi.hoisted(() => vi.fn());
const useItemActionsMock = vi.hoisted(() => vi.fn());
const capturedItemFormModalsProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('../../../shared/contexts/useItemFormContext', () => ({
  useItemModal: useItemModalMock,
  useItemActions: useItemActionsMock,
}));

vi.mock('../item/ItemFormModals', () => ({
  default: (props: Record<string, unknown>) => {
    capturedItemFormModalsProps.current = props;
    return <div data-testid="item-form-modals" />;
  },
}));

describe('ItemModalContainer', () => {
  beforeEach(() => {
    capturedItemFormModalsProps.current = null;
    useItemModalMock.mockReset();
    useItemActionsMock.mockReset();

    useItemModalMock.mockReturnValue({
      isAddEditModalOpen: true,
      isAddTypeModalOpen: false,
      isAddUnitModalOpen: true,
      isAddDosageModalOpen: false,
      isAddManufacturerModalOpen: true,
      currentSearchTermForModal: 'search term',
      setIsAddEditModalOpen: vi.fn(),
      setIsAddTypeModalOpen: vi.fn(),
      setIsAddUnitModalOpen: vi.fn(),
      setIsAddDosageModalOpen: vi.fn(),
      setIsAddManufacturerModalOpen: vi.fn(),
      closeModalAndClearSearch: vi.fn(),
    });

    useItemActionsMock.mockReturnValue({
      handleSaveCategory: vi.fn(),
      handleSaveType: vi.fn(),
      handleSaveUnit: vi.fn(),
      handleSaveDosage: vi.fn(),
      handleSaveManufacturer: vi.fn(),
      addCategoryMutation: { isPending: false },
      addTypeMutation: { isPending: true },
      addUnitMutation: { isPending: false },
      addDosageMutation: { isPending: true },
      addManufacturerMutation: { isPending: false },
    });
  });

  it('maps item modal and action hooks into ItemFormModals config', () => {
    render(<ItemModalContainer />);

    const props = capturedItemFormModalsProps.current as {
      currentSearchTerm: string;
      categoryModal: Record<string, unknown>;
      typeModal: Record<string, unknown>;
      unitModal: Record<string, unknown>;
      dosageModal: Record<string, unknown>;
      manufacturerModal: Record<string, unknown>;
    };

    expect(props.currentSearchTerm).toBe('search term');
    expect(props.categoryModal).toMatchObject({ isOpen: true });
    expect(props.typeModal).toMatchObject({ isOpen: false });
    expect(props.unitModal).toMatchObject({ isOpen: true });
    expect(props.dosageModal).toMatchObject({ isOpen: false });
    expect(props.manufacturerModal).toMatchObject({ isOpen: true });
  });

  it('delegates modal close handlers through closeModalAndClearSearch', () => {
    render(<ItemModalContainer />);

    const modalState = useItemModalMock();
    const props = capturedItemFormModalsProps.current as {
      categoryModal: { onClose: () => void };
      typeModal: { onClose: () => void };
      unitModal: { onClose: () => void };
      dosageModal: { onClose: () => void };
      manufacturerModal: { onClose: () => void };
    };

    props.categoryModal.onClose();
    props.typeModal.onClose();
    props.unitModal.onClose();
    props.dosageModal.onClose();
    props.manufacturerModal.onClose();

    expect(modalState.closeModalAndClearSearch).toHaveBeenCalledTimes(5);
  });
});
