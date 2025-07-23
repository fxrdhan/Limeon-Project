import { useEffect, useState } from "react";
import { OverlayPosition } from "../types";
import { POSITION_OFFSET } from "../constants";

interface UseOverlayPositionProps {
  showError: boolean;
  error: string | null;
  targetRef: React.RefObject<HTMLElement | null>;
  isOpen?: boolean;
}

export const useOverlayPosition = ({
  showError,
  error,
  targetRef,
  isOpen = false,
}: UseOverlayPositionProps) => {
  const [position, setPosition] = useState<OverlayPosition | null>(null);

  useEffect(() => {
    if (showError && error && targetRef.current && !isOpen) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + POSITION_OFFSET,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showError, error, targetRef, isOpen]);

  return position;
};