import { motion } from "motion/react";
import type { HighlightFrame } from "./use-animated-menu-highlight";

const menuHighlightTransition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;

interface AnimatedMenuHighlightProps {
  className: string;
  frame: HighlightFrame;
}

export const AnimatedMenuHighlight = ({ className, frame }: AnimatedMenuHighlightProps) => (
  <motion.div
    aria-hidden="true"
    className={`pointer-events-none absolute top-0 z-0 rounded-lg ${className}`}
    initial={false}
    animate={{
      opacity: frame.isVisible ? 1 : 0,
      y: frame.top,
      height: frame.height,
    }}
    transition={frame.shouldAnimate ? menuHighlightTransition : { duration: 0 }}
  />
);
