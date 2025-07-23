import { useEffect, useState } from "react";

interface UseOverlayVisibilityProps {
  showError: boolean;
  hasAutoHidden: boolean;
  error: string | null;
  isHovered: boolean;
  isOpen: boolean;
}

export const useOverlayVisibility = ({
  showError,
  hasAutoHidden,
  error,
  isHovered,
  isOpen,
}: UseOverlayVisibilityProps) => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (hasAutoHidden && error) {
      // After auto-hide, show on hover
      setShowOverlay(isHovered && !isOpen);
    } else {
      // Normal display logic
      setShowOverlay(showError && !isOpen);
    }
  }, [showError, hasAutoHidden, error, isHovered, isOpen]);

  return { showOverlay, setShowOverlay };
};