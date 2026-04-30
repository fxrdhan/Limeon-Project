import { useState, type ChangeEvent, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TbFileDescription, TbMusic, TbPhoto, TbPlus } from 'react-icons/tb';
import { AnimatedMenuHighlight } from '@/components/shared/animated-menu-highlight';
import { useAnimatedMenuHighlight } from '@/components/shared/use-animated-menu-highlight';
import { CHAT_POPUP_MENU_SURFACE_CLASS_NAME } from '../chatPopupSurface';
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
}: ComposerAttachmentMenuProps) => {
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(
    null
  );
  const { highlightFrame, setItemRef } =
    useAnimatedMenuHighlight<HTMLButtonElement>(hoveredActionIndex);
  const attachmentActions = [
    {
      label: 'Gambar',
      icon: <TbPhoto className="h-4 w-4 text-black" />,
      onClick: () => onAttachImageClick(),
      className: 'px-1.5',
    },
    {
      label: 'Dokumen',
      icon: <TbFileDescription className="h-4 w-4 text-black" />,
      onClick: () => onAttachDocumentClick(),
      className: 'pl-1.5 pr-3',
    },
    {
      label: 'Audio',
      icon: <TbMusic className="h-4 w-4 text-black" />,
      onClick: onAttachAudioClick,
      className: 'px-1.5',
    },
  ];

  return (
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
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-100"
      >
        <motion.span
          animate={{ rotate: isAttachModalOpen ? 45 : 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="flex items-center justify-center"
        >
          <TbPlus size={20} className="text-black" />
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
              className={`relative inline-flex w-max flex-col rounded-xl p-1 ${CHAT_POPUP_MENU_SURFACE_CLASS_NAME}`}
              onMouseLeave={() => {
                setHoveredActionIndex(null);
              }}
            >
              <AnimatedMenuHighlight
                frame={highlightFrame}
                className="left-1 right-1 bg-slate-100"
              />
              {attachmentActions.map((action, actionIndex) => (
                <button
                  key={action.label}
                  ref={element => setItemRef(actionIndex, element)}
                  type="button"
                  onClick={action.onClick}
                  onMouseEnter={() => {
                    setHoveredActionIndex(actionIndex);
                  }}
                  className={`relative z-10 flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg py-1.5 text-sm text-black transition-colors ${action.className}`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
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
};
