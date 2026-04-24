import { useLayoutEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TbFileDescription, TbMusic, TbPhoto, TbPlus } from "react-icons/tb";
import { COMPOSER_SYNC_LAYOUT_TRANSITION } from "../../constants";

const attachmentMenuHighlightTransition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;

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
  const actionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(null);
  const [highlightFrame, setHighlightFrame] = useState({
    top: 0,
    height: 0,
    isVisible: false,
    shouldAnimate: false,
  });
  const attachmentActions = [
    {
      label: "Gambar",
      icon: <TbPhoto className="h-4 w-4 text-black" />,
      onClick: () => onAttachImageClick(),
      className: "px-1.5",
    },
    {
      label: "Dokumen",
      icon: <TbFileDescription className="h-4 w-4 text-black" />,
      onClick: () => onAttachDocumentClick(),
      className: "pl-1.5 pr-3",
    },
    {
      label: "Audio",
      icon: <TbMusic className="h-4 w-4 text-black" />,
      onClick: onAttachAudioClick,
      className: "px-1.5",
    },
  ];

  useLayoutEffect(() => {
    if (hoveredActionIndex === null) {
      setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
      return;
    }

    const actionButton = actionButtonRefs.current[hoveredActionIndex];
    if (!actionButton) {
      setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
      return;
    }

    const updateHighlightFrame = () => {
      setHighlightFrame((currentFrame) => ({
        top: actionButton.offsetTop,
        height: actionButton.offsetHeight,
        isVisible: true,
        shouldAnimate: currentFrame.isVisible,
      }));
    };

    updateHighlightFrame();
    const animationFrameId = window.requestAnimationFrame(updateHighlightFrame);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHighlightFrame);
    resizeObserver?.observe(actionButton);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
    };
  }, [hoveredActionIndex]);

  return (
    <motion.div
      layout="position"
      transition={{ layout: COMPOSER_SYNC_LAYOUT_TRANSITION }}
      className={`relative justify-self-start shrink-0 ${
        isMessageInputMultiline ? "col-start-1 row-start-2" : "col-start-1 row-start-1"
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
          transition={{ duration: 0.16, ease: "easeOut" }}
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
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative inline-flex w-max flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-[0_-10px_15px_-3px_rgba(15,23,42,0.10),0_-4px_6px_-4px_rgba(15,23,42,0.10)]"
              onMouseLeave={() => {
                setHoveredActionIndex(null);
              }}
            >
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1 right-1 top-0 z-0 rounded-lg bg-slate-100"
                initial={false}
                animate={{
                  opacity: highlightFrame.isVisible ? 1 : 0,
                  y: highlightFrame.top,
                  height: highlightFrame.height,
                }}
                transition={
                  highlightFrame.shouldAnimate ? attachmentMenuHighlightTransition : { duration: 0 }
                }
              />
              {attachmentActions.map((action, actionIndex) => (
                <button
                  key={action.label}
                  ref={(element) => {
                    actionButtonRefs.current[actionIndex] = element;
                  }}
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
};
