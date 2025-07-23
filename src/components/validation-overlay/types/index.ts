export interface ValidationOverlayProps {
  error: string | null;
  showError: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
  autoHide?: boolean;
  autoHideDelay?: number;
  onAutoHide?: () => void;
  isHovered?: boolean;
  hasAutoHidden?: boolean;
  isOpen?: boolean;
}

export interface OverlayPosition {
  top: number;
  left: number;
  width: number;
}

export interface ValidationOverlayComponentProps {
  error: string;
  position: OverlayPosition;
}

export interface ValidationIconProps {
  className?: string;
  size?: number;
}

export interface ValidationMessageProps {
  message: string;
}

export interface ValidationArrowProps {
  className?: string;
}

export interface ValidationPortalProps {
  children: React.ReactNode;
}