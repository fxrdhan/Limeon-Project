import { useEffect, useState } from 'react';

interface UseBadgeActionVisibilityProps {
  onHoverChange?: (hovered: boolean) => void;
  wantsDeleteButton: boolean;
  wantsEditButton: boolean;
  wantsInsertButton: boolean;
}

const useDelayedVisibility = (
  wantsButton: boolean,
  onHoverChange?: (hovered: boolean) => void
) => {
  const [isVisible, setIsVisible] = useState(wantsButton);

  useEffect(() => {
    if (wantsButton) {
      const rafId = requestAnimationFrame(() => {
        onHoverChange?.(true);
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(rafId);
    }

    const timeoutId = setTimeout(() => {
      onHoverChange?.(false);
      setIsVisible(false);
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [wantsButton, onHoverChange]);

  return isVisible;
};

export const useBadgeActionVisibility = ({
  onHoverChange,
  wantsDeleteButton,
  wantsEditButton,
  wantsInsertButton,
}: UseBadgeActionVisibilityProps) => {
  const editIconVisible = useDelayedVisibility(wantsEditButton, onHoverChange);
  const deleteIconVisible = useDelayedVisibility(
    wantsDeleteButton,
    onHoverChange
  );
  const insertIconVisible = useDelayedVisibility(
    wantsInsertButton,
    onHoverChange
  );

  return {
    deleteIconVisible,
    editIconVisible,
    insertIconVisible,
    showDeleteButtonSpace: wantsDeleteButton || deleteIconVisible,
    showEditButtonSpace: wantsEditButton || editIconVisible,
    showInsertButtonSpace: wantsInsertButton || insertIconVisible,
  };
};
