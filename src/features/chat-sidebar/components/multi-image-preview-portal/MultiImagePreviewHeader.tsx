import {
  TbArrowUpRight,
  TbCopy,
  TbCornerUpLeft,
  TbCornerUpRightDouble,
  TbDownload,
  TbLink,
  TbX,
} from 'react-icons/tb';

interface MultiImagePreviewHeaderProps {
  activePreviewIndex: number;
  isActivePreviewForwardable: boolean;
  onClose: () => void;
  onCopyActivePreviewImage: () => void;
  onCopyActivePreviewLink: () => void;
  onDownloadActivePreview: () => void;
  onForwardActivePreview: () => void;
  onOpenActivePreviewInNewTab: () => void;
  onReplyActivePreview: () => void;
  previewCount: number;
  previewName: string;
}

export const MultiImagePreviewHeader = ({
  activePreviewIndex,
  isActivePreviewForwardable,
  onClose,
  onCopyActivePreviewImage,
  onCopyActivePreviewLink,
  onDownloadActivePreview,
  onForwardActivePreview,
  onOpenActivePreviewInNewTab,
  onReplyActivePreview,
  previewCount,
  previewName,
}: MultiImagePreviewHeaderProps) => (
  <div className="flex h-14 items-center justify-between border-b border-slate-300 px-4">
    <p
      className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-black"
      title={`${activePreviewIndex + 1}/${previewCount} | ${previewName}`}
    >
      <span className="shrink-0">
        {activePreviewIndex + 1}/{previewCount}
      </span>
      <span className="shrink-0 text-slate-400">|</span>
      <span className="truncate">{previewName}</span>
    </p>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onOpenActivePreviewInNewTab}
        aria-label="Buka di tab baru"
        title="Buka di tab baru"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
      >
        <TbArrowUpRight className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onCopyActivePreviewLink}
        aria-label="Salin link"
        title="Salin link"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
      >
        <TbLink className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onCopyActivePreviewImage}
        aria-label="Salin gambar"
        title="Salin gambar"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
      >
        <TbCopy className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => {
          onReplyActivePreview();
          onClose();
        }}
        aria-label="Balas gambar"
        title="Balas gambar"
        disabled={!isActivePreviewForwardable}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-black transition-colors ${
          isActivePreviewForwardable
            ? 'cursor-pointer hover:bg-slate-100'
            : 'cursor-default opacity-40'
        }`}
      >
        <TbCornerUpLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onForwardActivePreview}
        aria-label="Teruskan gambar"
        title="Teruskan gambar"
        disabled={!isActivePreviewForwardable}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-black transition-colors ${
          isActivePreviewForwardable
            ? 'cursor-pointer hover:bg-slate-100'
            : 'cursor-default opacity-40'
        }`}
      >
        <TbCornerUpRightDouble className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onDownloadActivePreview}
        aria-label="Unduh gambar"
        title="Unduh gambar"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
      >
        <TbDownload className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup preview gambar"
        title="Tutup preview gambar"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
      >
        <TbX className="h-5 w-5" />
      </button>
    </div>
  </div>
);
