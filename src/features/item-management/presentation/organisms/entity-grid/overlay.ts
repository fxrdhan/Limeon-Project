import type { MasterDataType } from '@/features/item-management/shared/types';
import type { EntityGridEntityConfig } from './types';

const OVERLAY_TEXT_STYLE = 'padding: 10px; color: oklch(62.7% 0 0);';

const escapeOverlayText = (value: string) =>
  value.replace(/[&<>"']/g, char => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[char] ?? char;
  });

const isBadgeSearchMode = (search: string) =>
  search.startsWith('#') && (search.includes(':') || search.includes(' #'));

const createOverlayText = (message: string) =>
  `<span style="${OVERLAY_TEXT_STYLE}">${message}</span>`;

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
      return createOverlayText(
        `Tidak ada item dengan nama "${escapeOverlayText(search)}"`
      );
    }
    return createOverlayText('Tidak ada data item yang ditemukan');
  }

  if (activeTab === 'suppliers') {
    if (search && !isBadgeMode) {
      return createOverlayText(
        `Tidak ada supplier dengan nama "${escapeOverlayText(search)}"`
      );
    }
    return createOverlayText('Tidak ada data supplier yang ditemukan');
  }

  if (search && !isBadgeMode) {
    return createOverlayText(
      `${escapeOverlayText(entityConfig?.searchNoDataMessage || 'Tidak ada data yang cocok dengan pencarian')} "${escapeOverlayText(search)}"`
    );
  }

  return createOverlayText(
    escapeOverlayText(entityConfig?.noDataMessage || 'Tidak ada data')
  );
};
