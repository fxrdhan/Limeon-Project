import type {
  ComboboxOption,
  ComboboxOptionDisplay,
  HoverDetailData,
} from '@/types';

type DisplaySource = Partial<ComboboxOption> & Partial<HoverDetailData>;

export const getComboboxOptionDisplay = (
  source: DisplaySource
): ComboboxOptionDisplay => ({
  code: source.display?.code ?? source.code,
  description: source.display?.description ?? source.description,
  badgeLabel: source.display?.badgeLabel ?? source.metaLabel,
  badgeTone: source.display?.badgeTone ?? source.metaTone,
  updatedAt: source.display?.updatedAt ?? source.updatedAt ?? source.updated_at,
});

export const createHoverDetailData = (
  optionId: string,
  optionData?: Partial<HoverDetailData>
): HoverDetailData => {
  const display = getComboboxOptionDisplay(optionData ?? {});

  return {
    id: optionId,
    name: optionData?.name || 'Unknown',
    display,
    code: display.code,
    description: display.description,
    metaLabel: display.badgeLabel,
    metaTone: display.badgeTone,
    created_at: optionData?.createdAt ?? optionData?.created_at,
    createdAt: optionData?.createdAt ?? optionData?.created_at,
    updated_at: display.updatedAt,
    updatedAt: display.updatedAt,
  };
};
