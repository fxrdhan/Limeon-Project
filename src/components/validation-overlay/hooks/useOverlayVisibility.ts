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

  return { showOverlay };
};
