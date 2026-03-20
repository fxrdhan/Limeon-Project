import ImageExpandPreview from '@/components/shared/image-expand-preview';
import { TbX } from 'react-icons/tb';

interface DocumentPreviewPortalProps {
  isOpen: boolean;
  isVisible: boolean;
  previewUrl: string | null;
  previewName: string;
  onClose: () => void;
  backdropClassName: string;
  iframeTitle: string;
}

const DocumentPreviewPortal = ({
  isOpen,
  isVisible,
  previewUrl,
  previewName,
  onClose,
  backdropClassName,
  iframeTitle,
}: DocumentPreviewPortalProps) => {
  return (
    <ImageExpandPreview
      isOpen={isOpen}
      isVisible={isVisible}
      onClose={onClose}
      backdropClassName={backdropClassName}
      contentClassName="h-[92vh] w-[min(1100px,92vw)] max-w-[92vw] p-0"
      backdropRole="button"
      backdropTabIndex={0}
      backdropAriaLabel="Tutup preview dokumen"
      onBackdropKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {previewUrl ? (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
            <p className="min-w-0 truncate text-base font-medium text-slate-800">
              {previewName}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup preview dokumen"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <TbX className="h-5 w-5" />
            </button>
          </div>
          <iframe
            src={previewUrl}
            title={iframeTitle}
            className="h-full w-full flex-1 bg-white"
          />
        </div>
      ) : null}
    </ImageExpandPreview>
  );
};

export default DocumentPreviewPortal;
