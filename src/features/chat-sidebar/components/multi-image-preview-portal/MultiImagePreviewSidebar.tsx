import { LayoutGroup, motion } from 'motion/react';
import { THUMBNAIL_LAYOUT_TRANSITION } from './sidebarLayout';
import type { MultiImagePreviewPortalItem } from './types';

interface MultiImagePreviewSidebarProps {
  activePreviewId: string;
  activeTileSize: number;
  onSelectPreview: (messageId: string) => void;
  previewItems: MultiImagePreviewPortalItem[];
  sidebarColumnCount: number;
}

export const MultiImagePreviewSidebar = ({
  activePreviewId,
  activeTileSize,
  onSelectPreview,
  previewItems,
  sidebarColumnCount,
}: MultiImagePreviewSidebarProps) => (
  <aside className="flex w-full shrink-0 border-b border-slate-300 bg-white md:w-[var(--multi-image-preview-sidebar-width)] md:border-b-0">
    <LayoutGroup id="multi-image-preview-thumbnails">
      <div
        className="grid max-h-full flex-1 content-start gap-4 overflow-y-auto p-4"
        style={{
          gridTemplateColumns: `repeat(${sidebarColumnCount}, ${activeTileSize}px)`,
          gridAutoRows: `${activeTileSize}px`,
          scrollbarGutter: 'stable',
        }}
      >
        {previewItems.map((previewItem, index) => {
          const isActive = previewItem.id === activePreviewId;

          return (
            <motion.button
              key={previewItem.id}
              layout
              transition={THUMBNAIL_LAYOUT_TRANSITION}
              type="button"
              onClick={() => onSelectPreview(previewItem.id)}
              aria-label={`Pilih gambar ${index + 1}`}
              aria-pressed={isActive}
              className={`group relative h-full w-full overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-200 ${
                isActive
                  ? 'border-primary'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              {previewItem.thumbnailUrl ||
              previewItem.previewUrl ||
              previewItem.fullPreviewUrl ? (
                <img
                  src={
                    previewItem.thumbnailUrl ||
                    previewItem.previewUrl ||
                    previewItem.fullPreviewUrl ||
                    ''
                  }
                  alt={`Thumbnail ${previewItem.previewName}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  className="h-full w-full bg-slate-100"
                  aria-hidden="true"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  </aside>
);
