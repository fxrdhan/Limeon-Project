import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import classNames from 'classnames';

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

  // Animation options
  layoutId?: string;
  animationPreset?: 'smooth' | 'snappy' | 'fluid';

  // Additional props
  className?: string;
  disabled?: boolean;
}

const ANIMATION_PRESETS = {
  smooth: {
    container: { stiffness: 400, damping: 30, duration: 0.6 },
    background: { stiffness: 500, damping: 30, duration: 0.3 },
  },
  snappy: {
    container: { stiffness: 600, damping: 25, duration: 0.4 },
    background: { stiffness: 700, damping: 25, duration: 0.2 },
  },
  fluid: {
    container: { stiffness: 300, damping: 35, duration: 0.8 },
    background: { stiffness: 400, damping: 35, duration: 0.4 },
  },
};

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
    button: 'rounded-lg',
    background: 'rounded-lg',
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
  layoutId,
  animationPreset = 'smooth',
  className,
  disabled = false,
}: SlidingSelectorProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const mouseLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastNavigationTimeRef = useRef<number>(0);
  const navigationThrottleMs = 250; // Minimum delay between page changes

  const activeOption = options.find(option => option.key === activeKey);
  const animation = ANIMATION_PRESETS[animationPreset];
  const sizeClasses = SIZE_CLASSES[size];
  const shapeClasses = SHAPE_CLASSES[shape];

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
      setIsExpanded(true);
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

  // Keyboard navigation handler - Tab/Arrow keys directly change page with throttle
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled || !isExpanded) return;

      const enabledOptions = options.filter(opt => !opt.disabled);
      const currentIndex =
        focusedIndex >= 0
          ? focusedIndex
          : enabledOptions.findIndex(opt => opt.key === activeKey);

      // Throttle check for page changes
      const now = Date.now();
      const timeSinceLastNav = now - lastNavigationTimeRef.current;
      const canNavigate = timeSinceLastNav >= navigationThrottleMs;

      switch (event.key) {
        case 'Tab':
          // Prevent default tab behavior to control focus ourselves
          event.preventDefault();
          if (canNavigate) {
            if (event.shiftKey) {
              // Shift+Tab: Move to previous and change page
              const prevIndex =
                currentIndex > 0 ? currentIndex - 1 : enabledOptions.length - 1;
              const prevOption = enabledOptions[prevIndex];
              setFocusedIndex(prevIndex);
              buttonRefs.current[prevIndex]?.focus();
              onSelectionChange(prevOption.key, prevOption.value);
              lastNavigationTimeRef.current = now;
            } else {
              // Tab: Move to next and change page
              const nextIndex =
                currentIndex < enabledOptions.length - 1 ? currentIndex + 1 : 0;
              const nextOption = enabledOptions[nextIndex];
              setFocusedIndex(nextIndex);
              buttonRefs.current[nextIndex]?.focus();
              onSelectionChange(nextOption.key, nextOption.value);
              lastNavigationTimeRef.current = now;
            }
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
      navigationThrottleMs,
    ]
  );

  const handleOptionClick = useCallback(
    (option: SlidingSelectorOption<T>, event: React.MouseEvent) => {
      if (disabled || option.disabled) return;

      // Blur focus after click to allow auto-collapse to work
      (event.currentTarget as HTMLButtonElement).blur();

      // Reset focused index to allow fresh keyboard navigation next time
      setFocusedIndex(-1);

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

  return (
    <LayoutGroup id={layoutId || `sliding-selector-${variant}`}>
      <motion.div
        layout
        role="tablist"
        aria-label="Navigation tabs"
        className={classNames(
          'flex items-center bg-zinc-100 shadow-md text-gray-700 overflow-hidden select-none relative w-fit',
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
        {!collapsible || isExpanded ? (
          // Expanded view - show all options
          options.map((option, index) => {
            const isActive = option.key === activeKey;
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
                  'group focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150',
                  sizeClasses.button,
                  shapeClasses.button,
                  {
                    'hover:bg-emerald-100 hover:text-secondary':
                      !isActive && !option.disabled,
                    'opacity-50 cursor-not-allowed': option.disabled,
                  }
                )}
                onClick={event => handleOptionClick(option, event)}
                disabled={disabled || option.disabled}
              >
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
                    'relative z-10 select-none font-medium whitespace-nowrap',
                    sizeClasses.text,
                    {
                      'text-white': isActive,
                      'text-gray-700 group-hover:text-secondary':
                        !isActive && !option.disabled,
                    }
                  )}
                >
                  {getDisplayLabel(option, isActive)}
                </motion.span>
              </button>
            );
          })
        ) : (
          // Collapsed view - show only active option with expand button
          <div className="flex items-center">
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
                  'ml-1 p-2 hover:bg-emerald-100 transition-colors duration-150 group',
                  shapeClasses.button
                )}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4 text-gray-600 group-hover:text-secondary"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="w-full h-full"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.div>
              </button>
            )}
          </div>
        )}
      </motion.div>
    </LayoutGroup>
  );
};
