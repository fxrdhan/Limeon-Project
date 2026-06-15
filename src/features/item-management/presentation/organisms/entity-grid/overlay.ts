import type { MasterDataType } from '@/features/item-management/shared/types';
import { buildAgGridNoRowsOverlayTemplate } from '@/lib/agGridOverlayTemplate';
import type { EntityGridEntityConfig } from './types';

const OVERLAY_TEXT_COLOR = 'oklch(62.7% 0 0)';

const isBadgeSearchMode = (search: string) =>
  search.startsWith('#') && (search.includes(':') || search.includes(' #'));

const createOverlayText = (message: string) =>
  buildAgGridNoRowsOverlayTemplate(message, OVERLAY_TEXT_COLOR);

interface GetEntityGridOverlayTemplateParams {
  activeTab: MasterDataType;
  search: string;
  entityConfig?: EntityGridEntityConfig | null;
}

export const getEntityGridOverlayNoRowsTemplate = ({
  activeTab,
  search,
  entityConfig,
}: GetEntityGridOverlayTemplateParams) => {
  const isBadgeMode = isBadgeSearchMode(search);

  if (activeTab === 'items') {
    if (search && !isBadgeMode) {
      return createOverlayText(`Tidak ada item dengan nama "${search}"`);
    }
    return createOverlayText('Tidak ada data item yang ditemukan');
  }

  if (activeTab === 'suppliers') {
    if (search && !isBadgeMode) {
      return createOverlayText(`Tidak ada supplier dengan nama "${search}"`);
    }
    return createOverlayText('Tidak ada data supplier yang ditemukan');
  }

  if (search && !isBadgeMode) {
    return createOverlayText(
      `${entityConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian'} "${search}"`
    );
  }

  return createOverlayText(entityConfig?.noDataMessage || 'Tidak ada data');
};
