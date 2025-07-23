export const DEFAULT_AUTO_HIDE_DELAY = 1000;
export const POSITION_OFFSET = 8;
export const ARROW_LEFT_OFFSET = 16;

export const ANIMATION_VARIANTS = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

export const ANIMATION_TRANSITION = {
  duration: 0.15,
  ease: "easeOut" as const,
};

export const ICON_SIZE = 14;

export const STYLES = {
  overlay: "fixed z-[9999] pointer-events-none",
  container: "bg-danger/75 text-white text-sm px-3 py-2 rounded-lg shadow-lg backdrop-blur-xs flex items-center gap-2 w-fit",
  icon: "text-yellow-300 flex-shrink-0",
  message: "font-medium",
  arrow: "absolute -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-danger/75 backdrop-blur-xs",
};