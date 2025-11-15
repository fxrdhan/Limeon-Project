import React, { useEffect } from 'react';

interface UseModalAnimationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const useModalAnimation = ({
  isOpen,
  onClose,
}: UseModalAnimationProps) => {
  // Use getDerivedStateFromProps to reset isClosing when isOpen changes
  const [closingState, setClosingState] = React.useState({
    isOpen: false,
    isClosing: false,
  });
  if (isOpen !== closingState.isOpen) {
    setClosingState({ isOpen, isClosing: false });
  }
  const isClosing = closingState.isClosing;
  const setIsClosing = (value: boolean) => {
    setClosingState(prev => ({ ...prev, isClosing: value }));
  };

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

  // isClosing auto-resets when isOpen changes (getDerivedStateFromProps pattern)

  return {
    isClosing,
    handleClose,
  };
};
