import { useState } from 'react';

export const useAddItemUIState = () => {
  const [isClosing, setIsClosing] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isDescriptionHovered, setIsDescriptionHovered] = useState(false);
  const [showFefoTooltip, setShowFefoTooltip] = useState(false);

  return {
    isClosing,
    setIsClosing,
    showDescription,
    setShowDescription,
    isDescriptionHovered,
    setIsDescriptionHovered,
    showFefoTooltip,
    setShowFefoTooltip,
  };
};
