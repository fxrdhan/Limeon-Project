import type { ChangeEvent, RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TbFileDescription, TbMusic, TbPhoto, TbPlus } from 'react-icons/tb';
import { COMPOSER_SYNC_LAYOUT_TRANSITION } from '../../constants';

interface ComposerAttachmentMenuProps {
  isAttachModalOpen: boolean;
  isMessageInputMultiline: boolean;
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  onAttachButtonClick: () => void;
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onAttachAudioClick: () => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDocumentFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAudioFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const ComposerAttachmentMenu = ({
  isAttachModalOpen,
  isMessageInputMultiline,
  attachButtonRef,
  attachModalRef,
  imageInputRef,
  documentInputRef,
  audioInputRef,
  onAttachButtonClick,
  onAttachImageClick,
  onAttachDocumentClick,
  onAttachAudioClick,
  onImageFileChange,
  onDocumentFileChange,
  onAudioFileChange,
}: ComposerAttachmentMenuProps) => (
  <motion.div
    layout="position"
    transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
    className={`relative justify-self-start shrink-0 ${
      isMessageInputMultiline
        ? 'col-start-1 row-start-2'
        : 'col-start-1 row-start-1'
    }`}
  >
    <motion.button
      type="button"
      ref={attachButtonRef}
      onClick={onAttachButtonClick}
      aria-label="Lampirkan file"
      aria-expanded={isAttachModalOpen}
      aria-haspopup="dialog"
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100"
    >
      <motion.span
        animate={{ rotate: isAttachModalOpen ? 45 : 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="flex items-center justify-center"
      >
        <TbPlus size={20} />
      </motion.span>
    </motion.button>

    <AnimatePresence>
      {isAttachModalOpen ? (
        <div className="absolute bottom-[calc(100%+16px)] left-[-10px] z-20">
          <motion.div
            ref={attachModalRef}
            role="dialog"
            aria-label="Lampirkan file"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="inline-flex w-max flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
          >
            <button
              type="button"
              onClick={() => onAttachImageClick()}
              className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-1.5 py-1.5 text-sm text-black transition-colors hover:bg-slate-100"
            >
              <TbPhoto className="h-4 w-4 text-black" />
              <span>Gambar</span>
            </button>
            <button
              type="button"
              onClick={() => onAttachDocumentClick()}
              className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl py-1.5 pl-1.5 pr-3 text-sm text-black transition-colors hover:bg-slate-100"
            >
              <TbFileDescription className="h-4 w-4 text-black" />
              <span>Dokumen</span>
            </button>
            <button
              type="button"
              onClick={onAttachAudioClick}
              className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-1.5 py-1.5 text-sm text-black transition-colors hover:bg-slate-100"
            >
              <TbMusic className="h-4 w-4 text-black" />
              <span>Audio</span>
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>

    <input
      ref={imageInputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={onImageFileChange}
    />
    <input
      ref={documentInputRef}
      type="file"
      accept="*/*"
      multiple
      className="hidden"
      onChange={onDocumentFileChange}
    />
    <input
      ref={audioInputRef}
      type="file"
      accept="audio/*"
      multiple
      className="hidden"
      onChange={onAudioFileChange}
    />
  </motion.div>
);
