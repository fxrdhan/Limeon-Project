import { useCallback, useEffect, useRef, useState } from 'react';

interface UseComposerAttachMenuProps {
  closeMessageMenu: () => void;
}

export const useComposerAttachMenu = ({
  closeMessageMenu,
}: UseComposerAttachMenuProps) => {
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const attachModalRef = useRef<HTMLDivElement>(null);

  const closeAttachModal = useCallback(() => {
    setIsAttachModalOpen(false);
  }, []);

  const handleAttachButtonClick = useCallback(() => {
    if (isAttachModalOpen) {
      closeAttachModal();
      return;
    }

    closeMessageMenu();
    setIsAttachModalOpen(true);
  }, [closeAttachModal, closeMessageMenu, isAttachModalOpen]);

  useEffect(() => {
    if (!isAttachModalOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (eventTarget instanceof Element) {
        const profileLayer = eventTarget.closest(
          '[data-profile-trigger="true"], [data-profile-portal="true"]'
        );
        if (profileLayer) {
          return;
        }
      }

      if (attachModalRef.current?.contains(eventTarget)) {
        return;
      }
      if (attachButtonRef.current?.contains(eventTarget)) {
        return;
      }

      closeAttachModal();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAttachModal();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAttachModal, isAttachModalOpen]);

  return {
    isAttachModalOpen,
    attachButtonRef,
    attachModalRef,
    closeAttachModal,
    handleAttachButtonClick,
  };
};
