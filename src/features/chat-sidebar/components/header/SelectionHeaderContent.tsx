import {
  TbCopy,
  TbLayoutSidebarRightCollapse,
  TbSquareOff,
  TbTrash,
  TbX,
} from 'react-icons/tb';

interface SelectionHeaderContentProps {
  selectedMessageCount: number;
  canDeleteSelectedMessages: boolean;
  onCopySelectedMessages: () => void;
  onDeleteSelectedMessages: () => void;
  onClearSelectedMessages: () => void;
  onExitSelectionMode: () => void;
  onClose: () => void;
}

const floatingBlockClass =
  'rounded-full border border-slate-200/95 bg-white/95';
const floatingIconButtonClass = `${floatingBlockClass} inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-black transition-colors hover:bg-slate-50 hover:text-black disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`;

const SelectionHeaderContent = ({
  selectedMessageCount,
  canDeleteSelectedMessages,
  onCopySelectedMessages,
  onDeleteSelectedMessages,
  onClearSelectedMessages,
  onExitSelectionMode,
  onClose,
}: SelectionHeaderContentProps) => (
  <div className="flex w-full items-center justify-end gap-2">
    <button
      type="button"
      aria-label="Batalkan semua pilihan"
      title="Batalkan semua pilihan"
      className={floatingIconButtonClass}
      onClick={onClearSelectedMessages}
      disabled={selectedMessageCount === 0}
    >
      <TbSquareOff size={18} />
    </button>
    <span
      className={`${floatingBlockClass} inline-flex h-9 min-w-20 items-center justify-center px-3 text-sm font-semibold text-black`}
      aria-live="polite"
    >
      {selectedMessageCount} dipilih
    </span>
    <button
      type="button"
      className={`${floatingBlockClass} inline-flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium text-black transition-colors hover:bg-slate-50 hover:text-black disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`}
      onClick={onCopySelectedMessages}
      disabled={selectedMessageCount === 0}
      title="Salin pesan terpilih"
      aria-label="Salin pesan terpilih"
    >
      <TbCopy size={16} />
      Salin
    </button>
    <button
      type="button"
      className={`${floatingBlockClass} inline-flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 disabled:hover:bg-white`}
      onClick={onDeleteSelectedMessages}
      disabled={!canDeleteSelectedMessages}
      title="Hapus pesan terpilih"
      aria-label="Hapus pesan terpilih"
    >
      <TbTrash size={16} />
      Hapus
    </button>
    <button
      type="button"
      aria-label="Keluar mode pilih pesan"
      title="Keluar mode pilih pesan"
      className={floatingIconButtonClass}
      onClick={onExitSelectionMode}
    >
      <TbX size={20} />
    </button>
    <button
      onClick={onClose}
      aria-label="Tutup sidebar chat"
      title="Tutup sidebar chat"
      className={floatingIconButtonClass}
    >
      <TbLayoutSidebarRightCollapse size={20} />
    </button>
  </div>
);

export default SelectionHeaderContent;
