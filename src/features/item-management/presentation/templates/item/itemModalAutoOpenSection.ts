import type { ItemFormData, ItemModalProps } from '../../../shared/types';
import type { AccordionSection } from './itemModalStackTypes';

interface GetItemModalAutoOpenSectionParams {
  conversionCount: number;
  formData: Partial<ItemFormData>;
  formLoading: boolean;
  hasEditData: boolean;
  hasFormData: boolean;
  initialItemData?: ItemModalProps['initialItemData'];
}

export const getItemModalAutoOpenSection = ({
  conversionCount,
  formData,
  formLoading,
  hasEditData,
  hasFormData,
  initialItemData,
}: GetItemModalAutoOpenSectionParams): AccordionSection | null => {
  if (!hasEditData || formLoading) return null;

  const dataSource = (hasFormData ? formData : initialItemData) ?? null;
  const barcode = (dataSource?.barcode || '') as string;
  const description =
    dataSource && 'description' in dataSource
      ? ((dataSource.description as string) ?? '')
      : '';
  const basePrice = dataSource?.base_price ?? 0;
  const sellPrice = dataSource?.sell_price ?? 0;
  const fallbackConversions = Array.isArray(
    (initialItemData as { package_conversions?: unknown[] } | undefined)
      ?.package_conversions
  )
    ? (initialItemData as { package_conversions: unknown[] })
        .package_conversions.length
    : 0;
  const resolvedConversionCount = conversionCount || fallbackConversions;

  const hasAdditionalInfo =
    Boolean(barcode?.trim()) || Boolean(description?.trim());
  const hasConversion = resolvedConversionCount > 0;
  const hasSettings =
    dataSource &&
    'is_active' in dataSource &&
    (dataSource.is_active === false ||
      dataSource.has_expiry_date === true ||
      (dataSource.min_stock ?? 10) !== 10);
  const hasPricing = (basePrice ?? 0) > 0 || (sellPrice ?? 0) > 0;

  return hasAdditionalInfo
    ? 'additional'
    : hasConversion
      ? 'conversion'
      : hasSettings
        ? 'settings'
        : hasPricing
          ? 'pricing'
          : 'additional';
};
