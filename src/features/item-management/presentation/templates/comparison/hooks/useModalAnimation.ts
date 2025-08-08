import React, { useEffect } from 'react';

interface UseModalAnimationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const useModalAnimation = ({
  isOpen,
  onClose,
}: UseModalAnimationProps) => {
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = () => {
    if (!isClosing) {
      setIsClosing(true);
    }
  };

  // Effect to handle closing animation timing
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 250); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isClosing, onClose]);

  // Reset closing state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  return {
    isClosing,
    handleClose,
  };
};
