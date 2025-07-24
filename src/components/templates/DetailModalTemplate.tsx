import React, { Fragment, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Transition, TransitionChild, Dialog } from "@headlessui/react";

interface DetailModalTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  resetInternalState?: () => void;
  children: React.ReactNode;
}

const DetailModalTemplate: React.FC<DetailModalTemplateProps> = ({
  isOpen,
  onClose,
  resetInternalState,
  children,
}) => {
  const dialogPanelRef = useRef<HTMLDivElement>(null);
  const [, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);

    requestAnimationFrame(() => {
      const searchInput = document.querySelector(
        'input[placeholder*="Cari"]',
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    });

    onClose();
  };

  return createPortal(
    <Transition
      show={isOpen}
      as={Fragment}
      afterLeave={() => {
        setIsClosing(false);
        if (resetInternalState) resetInternalState();

        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[placeholder*="Cari"]',
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 50);
      }}
    >
      <Dialog
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
        onClose={handleClose}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
          />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="transition-all duration-200 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition-all duration-200 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Dialog.Panel
            ref={dialogPanelRef}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </Dialog.Panel>
        </TransitionChild>
      </Dialog>
    </Transition>,
    document.body,
  );
};

export default DetailModalTemplate;