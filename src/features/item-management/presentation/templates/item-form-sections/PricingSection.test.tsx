import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ItemPricingFormProps } from '../../organisms/item-pricing-form/types';
import PricingSection from './PricingSection';

type PricingFormData = {
  base_price: number;
  sell_price: number;
  is_level_pricing_active: boolean;
  base_inventory_unit_id: string;
  dosage_id: string | null;
};

let formData: PricingFormData;

const {
  createLevelMock,
  deleteLevelMock,
  handleChangeMock,
  updateFormDataMock,
  updateLevelsMock,
} = vi.hoisted(() => ({
  createLevelMock: vi.fn(),
  deleteLevelMock: vi.fn(),
  handleChangeMock: vi.fn(),
  updateFormDataMock: vi.fn(),
  updateLevelsMock: vi.fn(),
}));

vi.mock('../../../application/hooks/data/useCustomerLevels', () => ({
  useCustomerLevels: () => ({
    levels: [],
    isLoading: false,
    createLevel: {
      mutateAsync: createLevelMock,
      isPending: false,
    },
    updateLevels: {
      mutateAsync: updateLevelsMock,
      isPending: false,
    },
    deleteLevel: {
      mutateAsync: deleteLevelMock,
      isPending: false,
    },
  }),
}));

vi.mock('../../../shared/contexts/useItemFormContext', () => ({
  useItemForm: () => ({
    formData,
    updateFormData: updateFormDataMock,
    handleChange: handleChangeMock,
    dosages: [],
    packages: [],
  }),
  useItemPrice: () => ({
    packageConversionHook: {
      availableUnits: [],
      baseUnit: 'Tablet',
      setBaseInventoryUnitId: vi.fn(),
      setBaseUnit: vi.fn(),
      setBaseUnitKind: vi.fn(),
    },
    displayBasePrice: String(formData.base_price),
    displaySellPrice: String(formData.sell_price),
  }),
  useItemUI: () => ({
    resetKey: 'pricing-test',
    isViewingOldVersion: false,
  }),
}));

vi.mock('../../organisms/ItemPricingForm', () => ({
  default: (props: ItemPricingFormProps) => (
    <div>
      <span data-testid="margin-editor-value">
        {props.marginEditing.percentage}
      </span>
      <input
        aria-label="Harga jual"
        name="sell_price"
        onChange={props.onSellPriceChange}
        value={props.displaySellPrice}
      />
    </div>
  ),
}));

describe('PricingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    formData = {
      base_price: 1000,
      sell_price: 1250,
      is_level_pricing_active: true,
      base_inventory_unit_id: 'unit-base',
      dosage_id: null,
    };

    updateFormDataMock.mockImplementation((patch: Partial<PricingFormData>) => {
      formData = { ...formData, ...patch };
    });
    handleChangeMock.mockImplementation(
      (event: ChangeEvent<HTMLInputElement>) => {
        const fieldName = event.target.name as keyof Pick<
          PricingFormData,
          'base_price' | 'sell_price'
        >;
        formData = {
          ...formData,
          [fieldName]: Number(event.target.value) || 0,
        };
      }
    );
    createLevelMock.mockResolvedValue({
      id: 'level-1',
      level_name: 'Retail',
      price_percentage: 100,
    });
    updateLevelsMock.mockResolvedValue([]);
    deleteLevelMock.mockResolvedValue({ id: 'level-1' });
  });

  it('syncs the margin editor value from the latest recalculated margin', async () => {
    const props = { isExpanded: true, onExpand: vi.fn() };
    const { rerender } = render(<PricingSection {...props} />);

    expect(screen.getByTestId('margin-editor-value').textContent).toBe('25');

    fireEvent.change(screen.getByLabelText('Harga jual'), {
      target: { name: 'sell_price', value: '1500' },
    });
    rerender(<PricingSection {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('margin-editor-value').textContent).toBe('50');
    });
  });
});
