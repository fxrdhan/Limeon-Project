import {
  forwardRef,
  RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import MenuPortal from './menu/MenuPortal';
import MenuContent from './menu/MenuContent';
import SearchBar from './SearchBar';
import OptionItem from './OptionItem';
import EmptyState from './menu/EmptyState';
import { useComboboxContext } from '../hooks/useComboboxContext';
import { useComboboxVirtualization } from '../hooks/useComboboxVirtualization';
import { getComboboxOptionDisplay } from '../utils/optionDisplay';
import type { ComboboxMenuProps } from '../types';
import { COMBOBOX_CONSTANTS } from '../constants';
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
  hasKeyboardScrollTargetSettled,
  isWrappedKeyboardScroll,
  type KeyboardPinnedHighlightFrame,
} from '@/components/shared/keyboard-pinned-highlight';

type ComboboxSearchHighlightFrame = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

type HoverDetailTarget = {
  index: number;
  element: HTMLElement;
};

const getOptionFrameElementAtIndex = (
  container: HTMLDivElement,
  index: number
) =>
  container.querySelector<HTMLElement>(
    `[data-dropdown-option-frame][data-dropdown-option-index="${index}"]`
  );

const listOptionTransition = {
  layout: {
    type: 'spring' as const,
    stiffness: 520,
    damping: 38,
    mass: 0.7,
  },
  opacity: {
    duration: 0.1,
  },
  y: {
    duration: 0.1,
    ease: 'easeOut' as const,
  },
};

const ComboboxMenu = forwardRef<HTMLDivElement, ComboboxMenuProps>(
  (
    {
      popupId,
      popupLabel,
      children,
      isFrozen = false,
      leaveTimeoutRef,
      onSearchKeyDown,
      className,
      style,
      render,
    },
    ref
  ) => {
    const {
      isOpen,
      isClosing,
      applyOpenStyles,
      dropDirection,
      portalStyle,
      isPositionReady,
      isKeyboardNavigation,
      searchList,
      popupHasSearch,
      searchTerm,
      searchState,
      filteredOptions,
      labels,
      highlightedIndex,
      pendingHighlightedIndex,
      pendingHighlightSourceIndex,
      expandedId,
      activeDescendantId,
      value,
      withCheckbox,
      listboxId,
      getOptionId,
      onAddNew,
      onKeyDown,
      onSetHighlightedIndex,
      onSetIsKeyboardNavigation,
      onMenuEnter,
      onMenuLeave,
      onScroll,
      onHoverDetailShow,
      onHoverDetailHide,
      onHoverDetailSuppress,
      dropdownMenuRef,
      searchInputRef,
      optionsContainerRef,
      scrollState,
    } = useComboboxContext();
    const [heldHighlightFrame, setHeldHighlightFrame] =
      useState<KeyboardPinnedHighlightFrame | null>(null);
    const releaseHeldHighlightFrameRef = useRef<number | null>(null);
    const highlightInstanceId = useId();
    const openCycleRef = useRef(0);
    const wasOpenRef = useRef(false);
    const [isActiveBackgroundReady, setIsActiveBackgroundReady] =
      useState(false);
    const [
      isHighlightSuppressedDuringScroll,
      setIsHighlightSuppressedDuringScroll,
    ] = useState(false);
    const [searchHighlightFrame, setSearchHighlightFrame] =
      useState<ComboboxSearchHighlightFrame | null>(null);
    const lastPointerPositionRef = useRef<PointerPosition | null>(null);
    const hoverDetailScrollIdleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldVirtualize =
      filteredOptions.length > COMBOBOX_CONSTANTS.VIRTUALIZATION_THRESHOLD;
    const {
      isVirtualized,
      totalSize,
      virtualItems,
      visibleRange,
      measureElement,
      getScrollTargetForIndex,
      updateScrollMetrics,
    } = useComboboxVirtualization({
      enabled: shouldVirtualize,
      itemCount: filteredOptions.length,
      resetKey: filteredOptions,
      scrollContainerRef: optionsContainerRef,
    });

    if (isOpen && !wasOpenRef.current) {
      openCycleRef.current += 1;
    }
    wasOpenRef.current = isOpen;

    const activeBackgroundLayoutId = `dropdown-active-background-${highlightInstanceId}-${openCycleRef.current}-${searchTerm}-${filteredOptions[0]?.id ?? 'empty'}`;
    const shouldAnimateListItems = searchTerm.trim() !== '' && !isVirtualized;
    const hasCustomContent = children !== undefined;
    const shouldPinSearchHighlight =
      !hasCustomContent &&
      shouldAnimateListItems &&
      highlightedIndex >= 0 &&
      !heldHighlightFrame &&
      !isHighlightSuppressedDuringScroll;

    useEffect(() => {
      if (!isOpen || !applyOpenStyles || !isPositionReady) {
        setIsActiveBackgroundReady(false);
        return;
      }

      const frameId = window.requestAnimationFrame(() => {
        setIsActiveBackgroundReady(true);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [applyOpenStyles, isOpen, isPositionReady, activeBackgroundLayoutId]);

    useLayoutEffect(() => {
      if (!shouldPinSearchHighlight) {
        setSearchHighlightFrame(null);
        return;
      }

      const container = optionsContainerRef.current;
      const highlightedItem = container
        ? getOptionFrameElementAtIndex(container, highlightedIndex)
        : null;

      if (!container || !highlightedItem) {
        setSearchHighlightFrame(null);
        return;
      }

      const nextFrame = {
        top: highlightedItem.offsetTop,
        left: highlightedItem.offsetLeft,
        width: highlightedItem.offsetWidth,
        height: highlightedItem.offsetHeight,
      };

      setSearchHighlightFrame(previousFrame => {
        if (
          previousFrame &&
          previousFrame.top === nextFrame.top &&
          previousFrame.left === nextFrame.left &&
          previousFrame.width === nextFrame.width &&
          previousFrame.height === nextFrame.height
        ) {
          return previousFrame;
        }

        return nextFrame;
      });
    }, [
      filteredOptions,
      highlightedIndex,
      optionsContainerRef,
      shouldPinSearchHighlight,
    ]);

    useLayoutEffect(() => {
      if (pendingHighlightedIndex === null || !isKeyboardNavigation) return;

      const container = optionsContainerRef.current;
      const menuElement = dropdownMenuRef.current;
      const targetElement =
        container && pendingHighlightedIndex !== null
          ? getOptionFrameElementAtIndex(container, pendingHighlightedIndex)
          : null;
      const sourceElement =
        container && pendingHighlightSourceIndex !== null
          ? getOptionFrameElementAtIndex(container, pendingHighlightSourceIndex)
          : container && highlightedIndex >= 0
            ? getOptionFrameElementAtIndex(container, highlightedIndex)
            : null;

      if (!container || !menuElement) return;

      if (!targetElement) {
        const virtualScrollTarget = getScrollTargetForIndex(
          pendingHighlightedIndex
        );

        if (virtualScrollTarget) {
          if (typeof container.scrollTo === 'function') {
            container.scrollTo({
              top: virtualScrollTarget.scrollTop,
              behavior: 'smooth',
            });
          } else {
            container.scrollTop = virtualScrollTarget.scrollTop;
          }
          updateScrollMetrics();
        }

        return;
      }

      const scrollTarget = getKeyboardScrollTarget({
        container,
        itemCount: filteredOptions.length,
        targetElement,
        targetIndex: pendingHighlightedIndex,
      });

      if (scrollTarget !== null) {
        if (releaseHeldHighlightFrameRef.current !== null) {
          window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
        }

        const releaseHeldHighlightWhenTargetSettles = () => {
          const startedAt = window.performance.now();

          const checkTarget = () => {
            const currentContainer = optionsContainerRef.current;
            const currentTargetElement =
              currentContainer && pendingHighlightedIndex !== null
                ? getOptionFrameElementAtIndex(
                    currentContainer,
                    pendingHighlightedIndex
                  )
                : null;
            const hasHeldLongEnough =
              window.performance.now() - startedAt >=
              COMBOBOX_CONSTANTS.KEYBOARD_SCROLL_HIGHLIGHT_MAX_HOLD;

            if (!currentContainer || !currentTargetElement) {
              if (isVirtualized && !hasHeldLongEnough) {
                releaseHeldHighlightFrameRef.current =
                  window.requestAnimationFrame(checkTarget);
                return;
              }

              setHeldHighlightFrame(null);
              setIsHighlightSuppressedDuringScroll(false);
              releaseHeldHighlightFrameRef.current = null;
              return;
            }

            if (
              hasKeyboardScrollTargetSettled({
                container: currentContainer,
                scrollTop: scrollTarget.scrollTop,
                targetElement: currentTargetElement,
              }) ||
              hasHeldLongEnough
            ) {
              setHeldHighlightFrame(null);
              setIsHighlightSuppressedDuringScroll(false);
              releaseHeldHighlightFrameRef.current = null;
              return;
            }

            releaseHeldHighlightFrameRef.current =
              window.requestAnimationFrame(checkTarget);
          };

          releaseHeldHighlightFrameRef.current =
            window.requestAnimationFrame(checkTarget);
        };

        if (
          isWrappedKeyboardScroll({
            itemCount: filteredOptions.length,
            sourceIndex: pendingHighlightSourceIndex,
            targetIndex: pendingHighlightedIndex,
          })
        ) {
          setHeldHighlightFrame(null);
          setIsHighlightSuppressedDuringScroll(true);
          if (typeof container.scrollTo === 'function') {
            container.scrollTo({
              top: scrollTarget.scrollTop,
              behavior: 'smooth',
            });
          } else {
            container.scrollTop = scrollTarget.scrollTop;
          }
          releaseHeldHighlightWhenTargetSettles();
          return;
        }

        setIsHighlightSuppressedDuringScroll(false);
        setHeldHighlightFrame(
          getKeyboardPinnedHighlightFrame({
            container,
            frameRootElement: menuElement,
            scrollDirection: scrollTarget.direction,
            sourceElement,
            targetElement,
          })
        );
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({
            top: scrollTarget.scrollTop,
            behavior: 'smooth',
          });
        } else {
          container.scrollTop = scrollTarget.scrollTop;
        }
        releaseHeldHighlightWhenTargetSettles();
      }
    }, [
      dropdownMenuRef,
      filteredOptions.length,
      highlightedIndex,
      isKeyboardNavigation,
      optionsContainerRef,
      pendingHighlightedIndex,
      pendingHighlightSourceIndex,
      getScrollTargetForIndex,
      isVirtualized,
      updateScrollMetrics,
      visibleRange.endIndex,
      visibleRange.startIndex,
    ]);

    useLayoutEffect(() => {
      if (isKeyboardNavigation) return;
      if (releaseHeldHighlightFrameRef.current !== null) {
        window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
        releaseHeldHighlightFrameRef.current = null;
      }
      setHeldHighlightFrame(null);
      setIsHighlightSuppressedDuringScroll(false);
    }, [isKeyboardNavigation]);

    useEffect(() => {
      return () => {
        if (releaseHeldHighlightFrameRef.current !== null) {
          window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (!onHoverDetailShow) return;

      if (
        !isOpen ||
        !applyOpenStyles ||
        !isPositionReady ||
        highlightedIndex < 0
      ) {
        onHoverDetailHide?.();
        return;
      }

      if (!isKeyboardNavigation) return;

      if (heldHighlightFrame || isHighlightSuppressedDuringScroll) {
        onHoverDetailHide?.();
        return;
      }

      const frameId = window.requestAnimationFrame(() => {
        const container = optionsContainerRef.current;
        const highlightedOption = filteredOptions[highlightedIndex];
        const highlightedElement = container
          ? getOptionFrameElementAtIndex(container, highlightedIndex)
          : null;

        if (
          !container ||
          !highlightedOption ||
          highlightedOption.disabled ||
          !highlightedElement
        ) {
          onHoverDetailHide?.();
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const highlightedRect = highlightedElement.getBoundingClientRect();
        const isHighlightedElementVisible =
          highlightedRect.top >= containerRect.top - 1 &&
          highlightedRect.bottom <= containerRect.bottom + 1;

        if (!isHighlightedElementVisible) {
          onHoverDetailHide?.();
          return;
        }

        void onHoverDetailShow(
          highlightedOption.id,
          highlightedElement,
          {
            id: highlightedOption.id,
            name: highlightedOption.name,
            display: getComboboxOptionDisplay(highlightedOption),
          },
          { immediate: true }
        );
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [
      applyOpenStyles,
      filteredOptions,
      heldHighlightFrame,
      highlightedIndex,
      isHighlightSuppressedDuringScroll,
      isKeyboardNavigation,
      isOpen,
      isPositionReady,
      onHoverDetailHide,
      onHoverDetailShow,
      optionsContainerRef,
    ]);

    const getHoverDetailTargetAfterScroll =
      useCallback((): HoverDetailTarget | null => {
        const container = optionsContainerRef.current;
        if (!container) return null;

        if (isKeyboardNavigation && highlightedIndex >= 0) {
          const highlightedElement = getOptionFrameElementAtIndex(
            container,
            highlightedIndex
          );

          return highlightedElement
            ? { index: highlightedIndex, element: highlightedElement }
            : null;
        }

        const pointerPosition = lastPointerPositionRef.current;
        if (!pointerPosition) return null;

        const pointerElement = document.elementFromPoint(
          pointerPosition.x,
          pointerPosition.y
        );
        const optionElement = pointerElement?.closest<HTMLElement>(
          '[role="option"][data-dropdown-option-index]'
        );

        if (!optionElement || !container.contains(optionElement)) return null;

        const index = Number(optionElement.dataset.dropdownOptionIndex);
        if (!Number.isInteger(index)) return null;

        return { index, element: optionElement };
      }, [highlightedIndex, isKeyboardNavigation, optionsContainerRef]);

    const restoreHoverDetailAfterScroll = useCallback(() => {
      if (
        !onHoverDetailShow ||
        !isOpen ||
        !applyOpenStyles ||
        !isPositionReady
      ) {
        return;
      }

      const target = getHoverDetailTargetAfterScroll();
      if (!target) return;

      const option = filteredOptions[target.index];
      if (!option || option.disabled) return;

      void onHoverDetailShow(
        option.id,
        target.element,
        {
          id: option.id,
          name: option.name,
          display: getComboboxOptionDisplay(option),
        },
        { immediate: true }
      );
    }, [
      applyOpenStyles,
      filteredOptions,
      getHoverDetailTargetAfterScroll,
      isOpen,
      isPositionReady,
      onHoverDetailShow,
    ]);

    const setLastPointerPosition = useCallback(
      (
        event:
          | React.MouseEvent<HTMLDivElement>
          | React.WheelEvent<HTMLDivElement>
      ) => {
        lastPointerPositionRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      },
      []
    );

    const handleOptionsScroll = useCallback(() => {
      updateScrollMetrics();
      onScroll();

      if (!onHoverDetailSuppress || !onHoverDetailShow) return;

      const shouldRestoreHoverDetail = onHoverDetailSuppress();
      if (!shouldRestoreHoverDetail) return;

      if (hoverDetailScrollIdleTimeoutRef.current) {
        clearTimeout(hoverDetailScrollIdleTimeoutRef.current);
      }

      hoverDetailScrollIdleTimeoutRef.current = setTimeout(() => {
        hoverDetailScrollIdleTimeoutRef.current = null;
        restoreHoverDetailAfterScroll();
      }, COMBOBOX_CONSTANTS.HOVER_DETAIL_SCROLL_IDLE_DELAY);
    }, [
      onHoverDetailShow,
      onHoverDetailSuppress,
      onScroll,
      restoreHoverDetailAfterScroll,
      updateScrollMetrics,
    ]);

    useEffect(() => {
      return () => {
        if (hoverDetailScrollIdleTimeoutRef.current) {
          clearTimeout(hoverDetailScrollIdleTimeoutRef.current);
        }
      };
    }, []);

    const renderOptionItem = (
      option: (typeof filteredOptions)[number],
      index: number
    ) => (
      <OptionItem
        option={option}
        index={index}
        optionId={getOptionId(option.id)}
        optionCount={filteredOptions.length}
        isSelected={Boolean(
          withCheckbox && Array.isArray(value)
            ? value.includes(option.id)
            : option.id === value
        )}
        isHighlighted={highlightedIndex === index}
        suppressHighlightBackground={
          Boolean(heldHighlightFrame) ||
          isHighlightSuppressedDuringScroll ||
          shouldPinSearchHighlight
        }
        activeBackgroundLayoutId={
          isActiveBackgroundReady ? activeBackgroundLayoutId : undefined
        }
        isExpanded={expandedId === option.id}
        onHighlight={(index, event) => {
          onSetIsKeyboardNavigation(false);
          onSetHighlightedIndex(index, event);
        }}
        dropdownMenuRef={ref as RefObject<HTMLDivElement>}
      />
    );

    return (
      <MenuPortal
        ref={ref}
        id={popupId}
        role={popupHasSearch ? 'dialog' : undefined}
        ariaLabel={popupLabel}
        isFrozen={isFrozen}
        isOpen={isOpen}
        isClosing={isClosing}
        applyOpenStyles={applyOpenStyles}
        dropDirection={dropDirection}
        portalStyle={portalStyle}
        style={style}
        className={className}
        render={render}
        isPositionReady={isPositionReady}
        isKeyboardNavigation={isKeyboardNavigation}
        onMouseEnter={onMenuEnter}
        onMouseLeave={onMenuLeave}
      >
        {hasCustomContent ? (
          <div className="relative">{children}</div>
        ) : (
          <div className="relative">
            {heldHighlightFrame && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
                style={heldHighlightFrame}
              />
            )}
            {searchList && (
              <SearchBar
                ref={searchInputRef}
                onKeyDown={onSearchKeyDown}
                onFocus={() => {}}
                leaveTimeoutRef={leaveTimeoutRef}
              />
            )}
            <MenuContent scrollState={scrollState}>
              <div
                id={listboxId}
                ref={optionsContainerRef}
                role="listbox"
                aria-label={labels.listbox}
                aria-multiselectable={withCheckbox ? true : undefined}
                aria-activedescendant={activeDescendantId}
                data-state={isOpen ? 'open' : 'closed'}
                data-list-empty={filteredOptions.length === 0 ? '' : undefined}
                data-empty={filteredOptions.length === 0 ? '' : undefined}
                data-popup-open={isOpen ? '' : undefined}
                tabIndex={-1}
                className="relative p-1 max-h-60 overflow-y-auto focus:outline-hidden"
                onScroll={handleOptionsScroll}
                onWheel={setLastPointerPosition}
                onMouseMove={setLastPointerPosition}
                onMouseLeave={() => {
                  lastPointerPositionRef.current = null;
                }}
                onKeyDown={!searchList ? onKeyDown : undefined}
              >
                {searchHighlightFrame && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
                    style={searchHighlightFrame}
                  />
                )}
                {isVirtualized ? (
                  <div className="relative" style={{ height: totalSize }}>
                    {virtualItems.map(virtualItem => {
                      const option = filteredOptions[virtualItem.index];
                      if (!option) return null;

                      return (
                        <div
                          key={option.id}
                          ref={element => {
                            if (element) {
                              measureElement(virtualItem.index, element);
                            }
                          }}
                          data-dropdown-option-frame
                          data-dropdown-option-index={virtualItem.index}
                          className="absolute left-0 right-0"
                          style={{ top: virtualItem.start }}
                        >
                          {renderOptionItem(option, virtualItem.index)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredOptions.map((option, index) => (
                      <motion.div
                        key={option.id}
                        data-dropdown-option-frame
                        data-dropdown-option-index={index}
                        layout={shouldAnimateListItems ? 'position' : false}
                        initial={
                          shouldAnimateListItems ? { opacity: 0, y: 6 } : false
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          shouldAnimateListItems
                            ? { opacity: 0, y: -6 }
                            : undefined
                        }
                        transition={listOptionTransition}
                      >
                        {renderOptionItem(option, index)}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                {filteredOptions.length === 0 && (
                  <EmptyState
                    searchState={searchState}
                    searchTerm={searchTerm}
                    hasAddNew={!!onAddNew}
                    labels={labels}
                  />
                )}
              </div>
            </MenuContent>
          </div>
        )}
      </MenuPortal>
    );
  }
);

ComboboxMenu.displayName = 'ComboboxMenu';

export default ComboboxMenu;
