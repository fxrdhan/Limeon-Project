import { useEffect } from 'react';

interface UseModalAnimationProps {
  isClosing: boolean;
  onClose: () => void;
}

export const useModalAnimation = ({
  isClosing,
  onClose,
}: UseModalAnimationProps) => {
  useEffect(() => {
    if (isClosing) {
      onClose();
    }
  }, [isClosing, onClose]);

  const backdropVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  const modalVariants = {
    hidden: {
      scale: 0.95,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
    },
    exit: {
      scale: 0.95,
      opacity: 0,
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  return {
    backdropVariants,
    modalVariants,
    contentVariants,
  };
};
