import classNames from 'classnames';
import { LayoutGroup, motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TbChevronDown } from 'react-icons/tb';

export interface SlidingSelectorOption<T = unknown> {
  key: string;
  value: T;
  defaultLabel: string;
  activeLabel?: string;
  disabled?: boolean;
}

export interface SlidingSelectorProps<T = unknown> {
  options: SlidingSelectorOption<T>[];
  activeKey: string;
  onSelectionChange: (key: string, value: T, event?: React.MouseEvent) => void;

  // Styling options
  variant?: 'tabs' | 'selector';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill';

  // Expand/collapse functionality
  collapsible?: boolean;
  defaultExpanded?: boolean;
  autoCollapseDelay?: number;
  expandOnHover?: boolean;
  expandDirection?: 'horizontal' | 'vertical';

  // Animation options
  layoutId?: string;
  animationPreset?: 'smooth' | 'snappy' | 'fluid';

  // Additional props
  className?: string;
  disabled?: boolean;

  // Focus & state coordination (optional)
  onExpandedChange?: (expanded: boolean) => void;
}

const ANIMATION_PRESETS = {
  smooth: {
    container: { stiffness: 260, damping: 32, duration: 0.85 },
    background: { stiffness: 320, damping: 34, duration: 0.5 },
  },
  snappy: {
    container: { stiffness: 420, damping: 30, duration: 0.6 },
    background: { stiffness: 460, damping: 30, duration: 0.38 },
  },
  fluid: {
    container: { stiffness: 220, damping: 36, duration: 1 },
    background: { stiffness: 260, damping: 38, duration: 0.65 },
  },
};

const DIRECT_HOVER_TRANSITION = {
  duration: 0.22,
  ease: 'easeOut',
} as const;

const DIRECT_DROPDOWN_TRANSITION = {
  duration: 0.32,
  ease: 'easeOut',
} as const;

const CHEVRON_ROTATE_TRANSITION = {
  duration: 0.28,
  ease: 'easeInOut',
} as const;

const CHEVRON_EXIT_TRANSITION = {
  duration: 0.18,
  delay: 0.28,
  ease: 'easeOut',
} as const;

const ACTIVE_FILL_DELAYED_TRANSITION = {
  duration: 0.26,
  delay: 0.28,
  ease: 'easeOut',
} as const;

const ACTIVE_FILL_COLLAPSE_TRANSITION = {
  duration: 0.32,
  ease: 'easeInOut',
} as const;

const SIZE_CLASSES = {
  sm: {
    container: 'p-0.5',
    button: 'px-2 py-1 text-sm',
    text: 'text-sm',
  },
  md: {
    container: 'p-1',
    button: 'px-3 py-1.5',
    text: 'text-base',
  },
  lg: {
    container: 'p-1.5',
    button: 'px-6 py-3 text-lg',
    text: 'text-lg',
  },
};

const SHAPE_CLASSES = {
  rounded: {
    container: 'rounded-xl',
    button: 'rounded-xl',
    background: 'rounded-xl',
  },
  pill: {
    container: 'rounded-full',
    button: 'rounded-full',
    background: 'rounded-full',
  },
};

export const SlidingSelector = <T,>({
  options,
  activeKey,
  onSelectionChange,
  variant = 'selector',
  size = 'md',
  shape = 'rounded',
  collapsible = false,
  defaultExpanded = true,
  autoCollapseDelay = 300,
  expandOnHover = false,
  expandDirection = 'horizontal',
  layoutId,
  animationPreset = 'smooth',
  className,
  disabled = false,
  onExpandedChange,
}: SlidingSelectorProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVerticalActiveFillVisible, setIsVerticalActiveFillVisible] =
    useState(defaultExpanded && expandDirection === 'vertical');
  const mouseLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeOption = options.find(option => option.key === activeKey);
  const animation = ANIMATION_PRESETS[animationPreset];
  const sizeClasses = SIZE_CLASSES[size];
  const shapeClasses = SHAPE_CLASSES[shape];
  const isVerticalExpanded = isExpanded && expandDirection === 'vertical';
  const showVerticalActiveFill =
    expandDirection === 'vertical' && isVerticalActiveFillVisible;

  // Notify parent whenever expanded state changes
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  useEffect(() => {
    if (expandDirection !== 'vertical') {
      setIsVerticalActiveFillVisible(false);
      return;
    }

    if (isExpanded) {
      setIsVerticalActiveFillVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVerticalActiveFillVisible(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [expandDirection, isExpanded]);

  // Auto-collapse logic - don't collapse if keyboard navigating
  useEffect(() => {
    if (!collapsible || !expandOnHover) return;

    // Check if any button has focus (keyboard navigation)
    const hasFocus = buttonRefs.current.some(
      btn => btn && document.activeElement === btn
    );

    if (!isMouseOver && isExpanded && !hasFocus) {
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
        setFocusedIndex(-1);
      }, autoCollapseDelay);
    } else if (isMouseOver || hasFocus) {
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
        mouseLeaveTimeoutRef.current = null;
      }
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsExpanded(true);
      }, 0);
    }

    return () => {
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
    };
  }, [
    isMouseOver,
    isExpanded,
    collapsible,
    expandOnHover,
    autoCollapseDelay,
    focusedIndex,
  ]);

  // Auto-focus active button when expanded via hover to enable keyboard navigation immediately
  useEffect(() => {
    if (isExpanded && isMouseOver && expandOnHover && collapsible) {
      // Very small delay to ensure buttons are rendered
      const timer = setTimeout(() => {
        const activeIndex = options.findIndex(opt => opt.key === activeKey);
        if (activeIndex >= 0 && buttonRefs.current[activeIndex]) {
          buttonRefs.current[activeIndex]?.focus();
          setFocusedIndex(activeIndex);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isMouseOver, expandOnHover, collapsible, options, activeKey]);

  const handleMouseEnter = useCallback(() => {
    if (expandOnHover) {
      setIsMouseOver(true);
    }
  }, [expandOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (expandOnHover) {
      setIsMouseOver(false);
      setHoveredIndex(null);
      // Blur all buttons when mouse leaves to allow auto-collapse
      buttonRefs.current.forEach(btn => {
        if (btn && document.activeElement === btn) {
          btn.blur();
        }
      });
      setFocusedIndex(-1);
    }
  }, [expandOnHover]);

  const toggleExpanded = useCallback(() => {
    if (collapsible) {
      setIsExpanded(prev => !prev);
    }
  }, [collapsible]);

  // When expanding via toggle button, move focus to the active tab
  useEffect(() => {
    if (!collapsible) return;
    if (!isExpanded) return;

    // Only force focus when expanded via explicit toggle (not hover focus effect)
    if (!expandOnHover) {
      const activeIndex = options.findIndex(opt => opt.key === activeKey);
      if (activeIndex >= 0) {
        const timer = setTimeout(() => {
          buttonRefs.current[activeIndex]?.focus();
          setFocusedIndex(activeIndex);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [activeKey, collapsible, expandOnHover, isExpanded, options]);

  // Keyboard navigation handler - Tab keys directly change page
  // Note: Hybrid protection (immediate + debounce) handled centrally in parent's handleTabChange
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled || !isExpanded) return;

      // Ignore keyboard auto-repeat to prevent rapid navigation spam
      if (event.repeat) {
        return;
      }

      const enabledOptions = options.filter(opt => !opt.disabled);
      const currentIndex =
        focusedIndex >= 0
          ? focusedIndex
          : enabledOptions.findIndex(opt => opt.key === activeKey);

      switch (event.key) {
        case 'Tab':
          // Prevent default tab behavior to control focus ourselves
          event.preventDefault();
          if (event.shiftKey) {
            // Shift+Tab: Move to previous and change page
            const prevIndex =
              currentIndex > 0 ? currentIndex - 1 : enabledOptions.length - 1;
            const prevOption = enabledOptions[prevIndex];
            setFocusedIndex(prevIndex);
            buttonRefs.current[prevIndex]?.focus();
            onSelectionChange(prevOption.key, prevOption.value);
          } else {
            // Tab: Move to next and change page
            const nextIndex =
              currentIndex < enabledOptions.length - 1 ? currentIndex + 1 : 0;
            const nextOption = enabledOptions[nextIndex];
            setFocusedIndex(nextIndex);
            buttonRefs.current[nextIndex]?.focus();
            onSelectionChange(nextOption.key, nextOption.value);
          }
          break;

        case 'Escape':
          event.preventDefault();
          if (collapsible) {
            setIsExpanded(false);
            setFocusedIndex(-1);
          }
          break;
      }
    },
    [
      disabled,
      isExpanded,
      options,
      focusedIndex,
      activeKey,
      collapsible,
      onSelectionChange,
    ]
  );

  const handleOptionClick = useCallback(
    (option: SlidingSelectorOption<T>, event: React.MouseEvent) => {
      if (disabled || option.disabled) return;

      // Blur focus after click to allow auto-collapse to work
      (event.currentTarget as HTMLButtonElement).blur();

      // Reset focused index to allow fresh keyboard navigation next time
      setFocusedIndex(-1);

      // Note: Hybrid protection (immediate + debounce) handled centrally in parent's handleTabChange
      onSelectionChange(option.key, option.value, event);
    },
    [disabled, onSelectionChange]
  );

  const getDisplayLabel = (
    option: SlidingSelectorOption<T>,
    isActive: boolean
  ) => {
    if (isActive && option.activeLabel) {
      return option.activeLabel;
    }
    return option.defaultLabel;
  };

  const renderOption = (
    option: SlidingSelectorOption<T>,
    index: number,
    isVerticalItem = false
  ) => {
    const isActive = option.key === activeKey;
    const isHovered =
      hoveredIndex === index && !isActive && !disabled && !option.disabled;

    return (
      <button
        key={option.key}
        ref={el => {
          buttonRefs.current[index] = el;
        }}
        role="tab"
        aria-selected={isActive}
        aria-controls={`${layoutId || variant}-panel-${option.key}`}
        tabIndex={isActive ? 0 : -1}
        className={classNames(
          'group focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-300 ease-in-out',
          {
            'flex w-full items-center justify-start text-left': isVerticalItem,
          },
          sizeClasses.button,
          shapeClasses.button,
          {
            'opacity-50 cursor-not-allowed': option.disabled,
          }
        )}
        onMouseEnter={() => setHoveredIndex(index)}
        onClick={event => handleOptionClick(option, event)}
        disabled={disabled || option.disabled}
      >
        {isHovered && (
          <motion.div
            layoutId={`${layoutId || variant}-selector-hover-bg`}
            className={classNames(
              'absolute inset-0 bg-primary-light',
              shapeClasses.background
            )}
            transition={DIRECT_HOVER_TRANSITION}
          />
        )}
        {isActive && (
          <motion.div
            layoutId={`${layoutId || variant}-selector-bg`}
            className={classNames(
              'absolute inset-0 bg-primary shadow-xs',
              shapeClasses.background
            )}
            transition={{
              type: 'spring',
              ...animation.background,
            }}
          />
        )}
        <motion.span
          layout
          className={classNames(
            'relative z-10 select-none font-medium whitespace-nowrap transition-colors duration-300 ease-in-out',
            sizeClasses.text,
            {
              'text-white': isActive,
              'text-secondary delay-100': isHovered,
              'text-slate-700 delay-0': !isActive && !isHovered,
            }
          )}
        >
          {getDisplayLabel(option, isActive)}
        </motion.span>
      </button>
    );
  };

  const renderCollapsedContent = () => (
    <div className="flex items-center relative">
      {showVerticalActiveFill && (
        <motion.div
          initial={{ opacity: 1, scaleX: 0.72 }}
          animate={{
            opacity: 1,
            scaleX: isVerticalExpanded ? 1 : 0.72,
          }}
          className={classNames(
            'absolute inset-0 origin-left bg-primary shadow-xs',
            shapeClasses.background
          )}
          transition={
            isVerticalExpanded
              ? ACTIVE_FILL_DELAYED_TRANSITION
              : ACTIVE_FILL_COLLAPSE_TRANSITION
          }
        />
      )}
      <button
        role="tab"
        aria-selected="true"
        aria-controls={`${layoutId || variant}-panel-${activeKey}`}
        tabIndex={0}
        className={classNames(
          'group focus:outline-hidden select-none relative cursor-pointer z-10',
          sizeClasses.button,
          shapeClasses.button
        )}
        onClick={event =>
          activeOption && handleOptionClick(activeOption, event)
        }
        disabled={disabled}
      >
        <motion.div
          layoutId={
            showVerticalActiveFill
              ? undefined
              : `${layoutId || variant}-selector-bg`
          }
          className={classNames(
            'absolute inset-0 bg-primary shadow-xs',
            shapeClasses.background
          )}
          transition={{
            type: 'spring',
            ...animation.background,
          }}
        />
        <motion.span
          layout
          className={classNames(
            'relative z-10 select-none font-medium text-white whitespace-nowrap',
            sizeClasses.text
          )}
        >
          {activeOption && getDisplayLabel(activeOption, true)}
        </motion.span>
      </button>
      {collapsible && (
        <button
          onClick={toggleExpanded}
          aria-label={isExpanded ? 'Collapse tabs' : 'Expand tabs'}
          aria-expanded={isExpanded}
          className={classNames(
            'ml-1 p-2 transition-colors duration-300 ease-in-out group relative z-10',
            shapeClasses.button,
            {
              'hover:bg-primary-light': !showVerticalActiveFill,
            }
          )}
        >
          <motion.div
            animate={{
              rotate: isExpanded ? 180 : 0,
              opacity: isVerticalExpanded ? 0 : 1,
              x: isVerticalExpanded ? 8 : 0,
            }}
            transition={{
              rotate: CHEVRON_ROTATE_TRANSITION,
              opacity: isVerticalExpanded
                ? CHEVRON_EXIT_TRANSITION
                : DIRECT_HOVER_TRANSITION,
              x: isVerticalExpanded
                ? CHEVRON_EXIT_TRANSITION
                : DIRECT_HOVER_TRANSITION,
            }}
            className={classNames(
              'w-4 h-4',
              'text-slate-600 group-hover:text-secondary'
            )}
          >
            <TbChevronDown className="w-full h-full" />
          </motion.div>
        </button>
      )}
    </div>
  );

  const renderCollapsedPlaceholder = () => (
    <div className="flex items-center">
      <div
        className={classNames(
          'relative select-none',
          sizeClasses.button,
          shapeClasses.button
        )}
      >
        <span
          className={classNames(
            'relative z-10 select-none font-medium whitespace-nowrap',
            sizeClasses.text
          )}
        >
          {activeOption && getDisplayLabel(activeOption, true)}
        </span>
      </div>
      <div className={classNames('ml-1 p-2', shapeClasses.button)}>
        <div className="w-4 h-4" />
      </div>
    </div>
  );

  if (collapsible && expandDirection === 'vertical') {
    return (
      <LayoutGroup id={layoutId || `sliding-selector-${variant}`}>
        <div
          role="tablist"
          aria-label="Navigation tabs"
          className={classNames(
            'relative z-50 inline-block select-none',
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
        >
          <div
            aria-hidden="true"
            className={classNames(
              'invisible inline-flex items-center bg-zinc-100 shadow-md text-slate-700 overflow-hidden w-fit',
              sizeClasses.container,
              shapeClasses.container
            )}
          >
            {renderCollapsedPlaceholder()}
          </div>

          <motion.div
            className={classNames(
              'absolute left-0 top-0 inline-flex max-w-[calc(100vw-3rem)] origin-top flex-col bg-zinc-100 shadow-md text-slate-700 overflow-hidden w-fit',
              sizeClasses.container,
              shapeClasses.container
            )}
            transition={{
              type: 'spring',
              ...animation.container,
            }}
          >
            <div className="inline-flex items-center relative w-fit">
              {renderCollapsedContent()}
            </div>

            <motion.div
              aria-hidden={!isExpanded}
              animate={{
                height: isExpanded ? 'auto' : 0,
                opacity: isExpanded ? 1 : 0,
              }}
              className={classNames(
                'inline-flex max-h-[calc(100vh-10rem)] flex-col items-stretch overflow-y-auto overscroll-contain',
                {
                  'pointer-events-none': !isExpanded,
                }
              )}
              initial={false}
              transition={DIRECT_DROPDOWN_TRANSITION}
            >
              {options.map((option, index) =>
                option.key === activeKey
                  ? null
                  : renderOption(option, index, true)
              )}
            </motion.div>
          </motion.div>
        </div>
      </LayoutGroup>
    );
  }

  return (
    <LayoutGroup id={layoutId || `sliding-selector-${variant}`}>
      <motion.div
        layout
        role="tablist"
        aria-label="Navigation tabs"
        className={classNames(
          'bg-zinc-100 shadow-md text-slate-700 overflow-hidden select-none relative w-fit',
          isVerticalExpanded
            ? 'inline-flex max-h-[calc(100vh-7rem)] max-w-[calc(100vw-3rem)] flex-col items-stretch overflow-y-auto overscroll-contain'
            : 'inline-flex items-center',
          sizeClasses.container,
          shapeClasses.container,
          className
        )}
        transition={{
          layout: {
            type: 'spring',
            ...animation.container,
          },
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {!collapsible || isExpanded
          ? // Expanded view - show all options
            options.map((option, index) =>
              renderOption(option, index, isVerticalExpanded)
            )
          : // Collapsed view - show only active option with expand button
            renderCollapsedContent()}
      </motion.div>
    </LayoutGroup>
  );
};
