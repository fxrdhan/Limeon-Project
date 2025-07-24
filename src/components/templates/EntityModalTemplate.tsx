import React, { Fragment } from "react";
import { createPortal } from "react-dom";
import { Transition, TransitionChild } from "@headlessui/react";
import { useEntityModal } from "@/contexts/EntityModalContext";

interface EntityModalTemplateProps {
  children: React.ReactNode;
}

const EntityModalTemplate: React.FC<EntityModalTemplateProps> = ({ children }) => {
  const { ui, uiActions } = useEntityModal();
  const { isOpen } = ui;
  const { handleBackdropClick } = uiActions;

  return createPortal(
    <Transition show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
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
            onClick={handleBackdropClick}
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
          {children}
        </TransitionChild>
      </div>
    </Transition>,
    document.body
  );
};

export default EntityModalTemplate;