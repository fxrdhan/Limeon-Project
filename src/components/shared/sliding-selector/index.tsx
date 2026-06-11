import classNames from 'classnames';
import { LayoutGroup, motion } from 'motion/react';
import { TbChevronDown } from 'react-icons/tb';
import {
  ACTIVE_FILL_COLLAPSE_TRANSITION,
  ACTIVE_FILL_DELAYED_TRANSITION,
  ANIMATION_PRESETS,
  CHEVRON_EXIT_TRANSITION,
  CHEVRON_ROTATE_TRANSITION,
  DIRECT_DROPDOWN_TRANSITION,
  DIRECT_HOVER_TRANSITION,
  SHAPE_CLASSES,
  SIZE_CLASSES,
  canUseHoverPointer,
  getSlidingSelectorDisplayLabel,
} from './styles';
import type { SlidingSelectorOption, SlidingSelectorProps } from './types';
import { useSlidingSelectorInteraction } from './useSlidingSelectorInteraction';

export type { SlidingSelectorOption, SlidingSelectorProps } from './types';

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
  collapseSignal,
  className,
  disabled = false,
  onExpandedChange,
}: SlidingSelectorProps<T>) => {
  const activeOption = options.find(option => option.key === activeKey);
  const animation = ANIMATION_PRESETS[animationPreset];
  const sizeClasses = SIZE_CLASSES[size];
  const shapeClasses = SHAPE_CLASSES[shape];
  const {
    buttonRefs,
    handleKeyDown,
    handleMouseEnter,
    handleMouseLeave,
    handleOptionClick,
    hoveredIndex,
    isExpanded,
    isVerticalActiveFillVisible,
    rootRef,
    setHoveredIndex,
    toggleExpanded,
  } = useSlidingSelectorInteraction({
    activeKey,
    autoCollapseDelay,
    collapseSignal,
    collapsible,
    defaultExpanded,
    disabled,
    expandDirection,
    expandOnHover,
    onExpandedChange,
    onSelectionChange,
    options,
  });
  const isVerticalExpanded = isExpanded && expandDirection === 'vertical';
  const showVerticalActiveFill =
    expandDirection === 'vertical' && isVerticalActiveFillVisible;

  const renderOption = (
    option: SlidingSelectorOption<T>,
    index: number,
    isVerticalItem = false
  ) => {
    const isActive = option.key === activeKey;
    const isHovered =
      hoveredIndex === index && !isActive && !disabled && !option.disabled;

    return (
      <motion.button
        key={option.key}
        initial={false}
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
        onPointerDown={event => {
          if (event.pointerType !== 'mouse') {
            setHoveredIndex(null);
          }
        }}
        onMouseEnter={() => {
          if (canUseHoverPointer()) {
            setHoveredIndex(index);
          }
        }}
        onClick={event => handleOptionClick(option, event)}
        disabled={disabled || option.disabled}
      >
        {isHovered && (
          <motion.div
            layoutId={`${layoutId || variant}-selector-hover-bg`}
            className={classNames(
              'absolute inset-0 bg-primary/10',
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
          layout={isVerticalItem ? false : true}
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
          {getSlidingSelectorDisplayLabel(option, isActive)}
        </motion.span>
      </motion.button>
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
      <motion.button
        layout
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
        transition={{
          layout: {
            type: 'spring',
            ...animation.container,
          },
        }}
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
          layout="size"
          className={classNames(
            'relative z-10 inline-grid justify-items-start overflow-hidden text-left select-none font-medium text-white whitespace-nowrap',
            sizeClasses.text,
            sizeClasses.label
          )}
          transition={{
            layout: {
              type: 'spring',
              ...animation.container,
            },
          }}
        >
          <span className="col-start-1 row-start-1 inline-block justify-self-start whitespace-nowrap text-left">
            {activeOption && getSlidingSelectorDisplayLabel(activeOption, true)}
          </span>
        </motion.span>
      </motion.button>
      {collapsible && (
        <button
          onClick={toggleExpanded}
          aria-label={isExpanded ? 'Collapse tabs' : 'Expand tabs'}
          aria-expanded={isExpanded}
          className={classNames(
            'ml-1 p-2 transition-colors duration-300 ease-in-out group relative z-10',
            shapeClasses.button,
            {
              'hover:bg-primary/10': !showVerticalActiveFill,
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
            sizeClasses.text,
            sizeClasses.label
          )}
        >
          {activeOption && getSlidingSelectorDisplayLabel(activeOption, true)}
        </span>
      </div>
      <div className={classNames('ml-1 p-2', shapeClasses.button)}>
        <div className="w-4 h-4" />
      </div>
    </div>
  );

  const renderVerticalOptionList = () => (
    <motion.div
      aria-hidden={!isExpanded}
      animate={{
        height: isExpanded ? 'auto' : 0,
        opacity: isExpanded ? 1 : 0,
      }}
      className={classNames(
        'scrollbar-hide inline-flex max-h-[calc(100vh-10rem)] flex-col items-stretch overflow-y-auto overscroll-contain',
        {
          'pointer-events-none': !isExpanded,
        }
      )}
      initial={false}
      transition={DIRECT_DROPDOWN_TRANSITION}
    >
      {options.map((option, index) =>
        option.key === activeKey ? null : renderOption(option, index, true)
      )}
    </motion.div>
  );

  if (collapsible && expandDirection === 'vertical') {
    return (
      <LayoutGroup id={layoutId || `sliding-selector-${variant}`}>
        <div
          ref={rootRef}
          role="tablist"
          aria-label="Navigation tabs"
          tabIndex={-1}
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
              'invisible inline-flex items-center bg-white shadow-thin text-slate-700 overflow-hidden w-fit',
              sizeClasses.container,
              shapeClasses.container
            )}
          >
            {renderCollapsedPlaceholder()}
          </div>

          <motion.div
            layout
            className={classNames(
              'absolute left-0 top-0 inline-flex max-w-[calc(100vw-3rem)] origin-top flex-col bg-white shadow-thin text-slate-700 overflow-hidden w-fit',
              sizeClasses.container,
              shapeClasses.container
            )}
            transition={{
              layout: {
                type: 'spring',
                ...animation.container,
              },
            }}
          >
            <motion.div
              layout
              className="inline-flex items-center relative w-fit"
              transition={{
                layout: {
                  type: 'spring',
                  ...animation.container,
                },
              }}
            >
              {renderCollapsedContent()}
            </motion.div>

            {renderVerticalOptionList()}
          </motion.div>
        </div>
      </LayoutGroup>
    );
  }

  return (
    <LayoutGroup id={layoutId || `sliding-selector-${variant}`}>
      <motion.div
        ref={rootRef}
        layout
        role="tablist"
        aria-label="Navigation tabs"
        tabIndex={-1}
        className={classNames(
          'bg-white shadow-thin text-slate-700 overflow-hidden select-none relative w-fit',
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
