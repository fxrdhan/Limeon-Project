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
    container: 'rounded-lg',
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
  const mouseLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeOption = options.find(option => option.key === activeKey);
  const animation = ANIMATION_PRESETS[animationPreset];
  const sizeClasses = SIZE_CLASSES[size];
  const shapeClasses = SHAPE_CLASSES[shape];

  // Auto-collapse logic
  useEffect(() => {
    if (!collapsible || !expandOnHover) return;

    if (!isMouseOver && isExpanded) {
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, autoCollapseDelay);
    } else if (isMouseOver) {
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
  }, [isMouseOver, isExpanded, collapsible, expandOnHover, autoCollapseDelay]);

  const handleMouseEnter = useCallback(() => {
    if (expandOnHover) {
      setIsMouseOver(true);
    }
  }, [expandOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (expandOnHover) {
      setIsMouseOver(false);
    }
  }, [expandOnHover]);

  const toggleExpanded = useCallback(() => {
    if (collapsible) {
      setIsExpanded(prev => !prev);
    }
  }, [collapsible]);

  const handleOptionClick = useCallback(
    (option: SlidingSelectorOption<T>, event: React.MouseEvent) => {
      if (disabled || option.disabled) return;
      onSelectionChange(option.key, option.value, event);
    },
    [disabled, onSelectionChange]
  );

  const getDisplayLabel = (option: SlidingSelectorOption<T>, isActive: boolean) => {
    if (isActive && option.activeLabel) {
      return option.activeLabel;
    }
    return option.defaultLabel;
  };

  return (
    <LayoutGroup id={layoutId || `sliding-selector-${variant}`}>
      <motion.div
        layout
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
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {(!collapsible || isExpanded) ? (
          // Expanded view - show all options
          options.map(option => {
            const isActive = option.key === activeKey;
            return (
              <button
                key={option.key}
                className={classNames(
                  'group focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150',
                  sizeClasses.button,
                  shapeClasses.button,
                  {
                    'hover:bg-emerald-100 hover:text-emerald-700': !isActive && !option.disabled,
                    'opacity-50 cursor-not-allowed': option.disabled,
                  }
                )}
                onClick={(event) => handleOptionClick(option, event)}
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
                      'text-gray-700 group-hover:text-emerald-700': !isActive && !option.disabled,
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
              className={classNames(
                'group focus:outline-hidden select-none relative cursor-pointer z-10',
                sizeClasses.button,
                shapeClasses.button
              )}
              onClick={(event) => activeOption && handleOptionClick(activeOption, event)}
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
                className={classNames(
                  'ml-1 p-2 hover:bg-emerald-100 transition-colors duration-150 group',
                  shapeClasses.button
                )}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4 text-gray-600 group-hover:text-emerald-700"
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