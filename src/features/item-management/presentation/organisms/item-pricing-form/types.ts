import type {
  CSSProperties,
  ChangeEvent,
  Dispatch,
  KeyboardEvent,
  SetStateAction,
} from 'react';
import type { ComboboxOption } from '@/types/components';
import type { CustomerLevel } from '@/types/database';

export interface LevelPricingConfig {
  levels: CustomerLevel[];
  isLoading: boolean;
  discountByLevel: Record<string, number>;
  onDiscountChange: (levelId: string, value: string) => void;
  onCreateLevel: (payload: {
    level_name: string;
    price_percentage: number;
    description?: string | null;
  }) => Promise<CustomerLevel>;
  isCreating: boolean;
  onUpdateLevels: (
    payload: { id: string; price_percentage: number }[]
  ) => Promise<{ id: string; price_percentage: number }[]>;
  isUpdating: boolean;
  onDeleteLevel: (payload: {
    id: string;
    levels: CustomerLevel[];
  }) => Promise<{ id: string }>;
  isDeleting: boolean;
}

export interface ItemPricingFormProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: CSSProperties;
  formData: {
    base_price: number;
    sell_price: number;
    is_level_pricing_active?: boolean;
  };
  displayBasePrice: string;
  displaySellPrice: string;
  baseUnitId: string;
  baseUnit: string;
  baseUnitOptions: ComboboxOption[];
  marginEditing: {
    isEditing: boolean;
    percentage: string;
  };
  calculatedMargin: number | null;
  onBaseUnitChange: (value: string) => void;
  onBasePriceChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSellPriceChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onStartEditMargin: () => void;
  onStopEditMargin: () => void;
  onMarginInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMarginKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  isLevelPricingActive?: boolean;
  onLevelPricingActiveChange?: (active: boolean) => void;
  showLevelPricing?: boolean;
  onShowLevelPricing?: () => void;
  onHideLevelPricing?: () => void;
  levelPricing?: LevelPricingConfig;
  disabled?: boolean;
}

export type PopoverPosition = {
  top: number;
  left: number;
};

export type StringRecordSetter = Dispatch<
  SetStateAction<Record<string, string>>
>;
