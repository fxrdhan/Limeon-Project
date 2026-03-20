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
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[32px] border border-slate-300 bg-white md:flex-row">
          <aside className="flex w-full shrink-0 border-b border-slate-300 bg-white md:w-[320px] md:border-b-0 md:border-r">
            <div className="grid max-h-full flex-1 grid-cols-2 content-start gap-4 overflow-y-auto p-4">
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
                        ? 'border-primary'
                        : 'border-slate-300 hover:border-slate-400'
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

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="flex h-14 items-center justify-between border-b border-slate-300 px-4">
              <p
                className="flex min-w-0 items-center gap-2 truncate text-base font-medium text-slate-600"
                title={`${activePreviewIndex + 1}/${previewItems.length} | ${activePreview.previewName}`}
              >
                <span className="shrink-0">
                  {activePreviewIndex + 1}/{previewItems.length}
                </span>
                <span className="shrink-0 text-slate-400">|</span>
                <span className="truncate">{activePreview.previewName}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup preview gambar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <TbX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-white p-4 md:p-6">
              <img
                src={activePreview.previewUrl}
                alt={activePreview.previewName || 'Preview gambar'}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </div>
          </section>
        </div>
      ) : null}
    </ImageExpandPreview>
  );
};

export default MultiImagePreviewPortal;
