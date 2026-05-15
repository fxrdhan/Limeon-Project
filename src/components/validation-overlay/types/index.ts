export interface ValidationOverlayClassNames {
  overlay?: string;
  container?: string;
  icon?: string;
  message?: string;
  arrow?: string;
}

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
  classNames?: ValidationOverlayClassNames;
}

export interface OverlayPosition {
  top: number;
  left: number;
  width: number;
}

export interface ValidationOverlayComponentProps {
  error: string;
  position: OverlayPosition;
  classNames?: ValidationOverlayClassNames;
}

export interface ValidationIconProps {
  className?: string;
  size?: number;
}

export interface ValidationMessageProps {
  className?: string;
  message: string;
}

export interface ValidationArrowProps {
  className?: string;
}

export interface ValidationPortalProps {
  children: React.ReactNode;
}
