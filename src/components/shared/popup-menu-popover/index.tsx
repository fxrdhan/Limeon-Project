import { AnimatePresence, motion, type MotionProps } from 'motion/react';
import type { HTMLAttributes, ReactNode } from 'react';

interface PopupMenuPopoverProps extends Pick<
  MotionProps,
  'initial' | 'animate' | 'exit' | 'transition' | 'layout' | 'layoutId'
> {
  isOpen: boolean;
  children: ReactNode;
  menuId?: string;
  disableEnterAnimation?: boolean;
  className?: string;
  style?: HTMLAttributes<HTMLDivElement>['style'];
  onClick?: HTMLAttributes<HTMLDivElement>['onClick'];
  presenceInitial?: boolean;
}

const DEFAULT_INITIAL: MotionProps['initial'] = {
  opacity: 0,
  scale: 0.96,
  y: -6,
};
const DEFAULT_ANIMATE: MotionProps['animate'] = { opacity: 1, scale: 1, y: 0 };
const DEFAULT_EXIT: MotionProps['exit'] = { opacity: 0, scale: 0.98, y: -4 };
const DEFAULT_TRANSITION: MotionProps['transition'] = {
  duration: 0.12,
  ease: 'easeOut',
};

const PopupMenuPopover = ({
  isOpen,
  children,
  menuId,
  disableEnterAnimation = false,
  className,
  style,
  onClick,
  presenceInitial = true,
  initial = DEFAULT_INITIAL,
  animate = DEFAULT_ANIMATE,
  exit = DEFAULT_EXIT,
  transition = DEFAULT_TRANSITION,
  layout,
  layoutId,
}: PopupMenuPopoverProps) => {
  return (
    <AnimatePresence initial={presenceInitial}>
      {isOpen ? (
        <motion.div
          data-chat-menu-id={menuId}
          initial={disableEnterAnimation ? false : initial}
          animate={animate}
          exit={exit}
          transition={transition}
          layout={layout}
          layoutId={layoutId}
          className={className}
          style={style}
          onClick={onClick}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default PopupMenuPopover;
