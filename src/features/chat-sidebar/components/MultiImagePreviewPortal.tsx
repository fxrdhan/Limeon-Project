import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { TbX } from 'react-icons/tb';

interface MultiImagePreviewPortalItem {
  id: string;
  previewUrl: string;
  previewName: string;
}

interface MultiImagePreviewPortalProps {
  isOpen: boolean;
  isVisible: boolean;
  previewItems: MultiImagePreviewPortalItem[];
  activePreviewId: string | null;
  onSelectPreview: (messageId: string) => void;
  onClose: () => void;
  backdropClassName: string;
}

const MultiImagePreviewPortal = ({
  isOpen,
  isVisible,
  previewItems,
  activePreviewId,
  onSelectPreview,
  onClose,
  backdropClassName,
}: MultiImagePreviewPortalProps) => {
  const activePreview =
    previewItems.find(previewItem => previewItem.id === activePreviewId) ||
    previewItems[0] ||
    null;
  const activePreviewIndex = activePreview
    ? previewItems.findIndex(previewItem => previewItem.id === activePreview.id)
    : -1;

  return (
    <ImageExpandPreview
      isOpen={isOpen}
      isVisible={isVisible}
      onClose={onClose}
      backdropClassName={backdropClassName}
      contentClassName="h-[92vh] w-[min(1180px,92vw)] max-w-[92vw] p-0"
      backdropRole="button"
      backdropTabIndex={0}
      backdropAriaLabel="Tutup preview gambar"
      onBackdropKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {activePreview ? (
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl md:flex-row">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup preview gambar"
            className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-700"
          >
            <TbX className="h-5 w-5" />
          </button>

          <aside className="flex w-full shrink-0 border-b border-slate-200 bg-slate-50/95 md:w-[260px] md:border-b-0 md:border-r">
            <div className="grid max-h-full flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4">
              {previewItems.map((previewItem, index) => {
                const isActive = previewItem.id === activePreview.id;

                return (
                  <button
                    key={previewItem.id}
                    type="button"
                    onClick={() => onSelectPreview(previewItem.id)}
                    aria-label={`Pilih gambar ${index + 1}`}
                    aria-pressed={isActive}
                    className={`group relative aspect-square overflow-hidden rounded-2xl border text-left transition-all ${
                      isActive
                        ? 'border-primary shadow-[0_0_0_3px_rgba(14,165,233,0.16)]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={previewItem.previewUrl}
                      alt={`Thumbnail ${previewItem.previewName}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_rgba(241,245,249,0.95)_55%,_rgba(226,232,240,0.9))] p-4 md:p-8">
            <div className="absolute left-4 top-4 inline-flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span>
                {activePreviewIndex + 1} / {previewItems.length}
              </span>
              <span className="truncate text-slate-500">
                {activePreview.previewName}
              </span>
            </div>

            <img
              src={activePreview.previewUrl}
              alt={activePreview.previewName || 'Preview gambar'}
              className="max-h-full max-w-full rounded-[24px] object-contain shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
              draggable={false}
            />
          </div>
        </div>
      ) : null}
    </ImageExpandPreview>
  );
};

export default MultiImagePreviewPortal;
