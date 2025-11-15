// No React hooks needed - state is derived

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
  // Derive state directly from props - no effect needed!
  const showOverlay =
    hasAutoHidden && error ? isHovered && !isOpen : showError && !isOpen;

  // Note: setShowOverlay removed since state is now derived
  // If manual control is needed, this would need to be refactored differently
  const setShowOverlay = () => {
    // This is a no-op now since state is derived
    console.warn(
      'setShowOverlay is deprecated - state is now derived from props'
    );
  };

  return { showOverlay, setShowOverlay };
};
