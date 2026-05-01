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
import { useDropdownContext } from '../hooks/useDropdownContext';
import { useDropdownVirtualization } from '../hooks/useDropdownVirtualization';
import type { DropdownMenuProps } from '../types';
import { DROPDOWN_CONSTANTS } from '../constants';
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
  hasKeyboardScrollTargetSettled,
  isWrappedKeyboardScroll,
  type KeyboardPinnedHighlightFrame,
} from '@/components/shared/keyboard-pinned-highlight';

type DropdownSearchHighlightFrame = {
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

const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ isFrozen = false, leaveTimeoutRef, onSearchKeyDown }, ref) => {
    const {
      isOpen,
      isClosing,
      applyOpenStyles,
      dropDirection,
      portalStyle,
      isPositionReady,
      isKeyboardNavigation,
      searchList,
      searchTerm,
      searchState,
      filteredOptions,
      highlightedIndex,
      pendingHighlightedIndex,
      pendingHighlightSourceIndex,
      expandedId,
      value,
      withCheckbox,
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
    } = useDropdownContext();
    const [heldHighlightFrame, setHeldHighlightFrame] =
      useState<KeyboardPinnedHighlightFrame | null>(null);
    const releaseHeldHighlightFrameRef = useRef<number | null>(null);
    const highlightInstanceId = useId();
    const openCycleRef = useRef(0);
    const wasOpenRef = useRef(false);
    const [
      isHighlightSuppressedDuringScroll,
      setIsHighlightSuppressedDuringScroll,
    ] = useState(false);
    const [searchHighlightFrame, setSearchHighlightFrame] =
      useState<DropdownSearchHighlightFrame | null>(null);
    const lastPointerPositionRef = useRef<PointerPosition | null>(null);
    const hoverDetailScrollIdleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldVirtualize =
      filteredOptions.length > DROPDOWN_CONSTANTS.VIRTUALIZATION_THRESHOLD;
    const {
      isVirtualized,
      totalSize,
      virtualItems,
      visibleRange,
      measureElement,
      getScrollTargetForIndex,
      updateScrollMetrics,
    } = useDropdownVirtualization({
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
    const shouldPinSearchHighlight =
      shouldAnimateListItems &&
      highlightedIndex >= 0 &&
      !heldHighlightFrame &&
      !isHighlightSuppressedDuringScroll;

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
              DROPDOWN_CONSTANTS.KEYBOARD_SCROLL_HIGHLIGHT_MAX_HOLD;

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

        if (!container || !highlightedOption || !highlightedElement) {
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
            code: highlightedOption.code,
            description: highlightedOption.description,
            metaLabel: highlightedOption.metaLabel,
            metaTone: highlightedOption.metaTone,
            updated_at: highlightedOption.updated_at,
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
      if (!option) return;

      void onHoverDetailShow(
        option.id,
        target.element,
        {
          id: option.id,
          name: option.name,
          code: option.code,
          description: option.description,
          metaLabel: option.metaLabel,
          metaTone: option.metaTone,
          updated_at: option.updated_at,
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
      }, DROPDOWN_CONSTANTS.HOVER_DETAIL_SCROLL_IDLE_DELAY);
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
        activeBackgroundLayoutId={activeBackgroundLayoutId}
        isExpanded={expandedId === option.id}
        onHighlight={index => {
          onSetIsKeyboardNavigation(false);
          onSetHighlightedIndex(index);
        }}
        dropdownMenuRef={ref as RefObject<HTMLDivElement>}
      />
    );

    return (
      <MenuPortal
        ref={ref}
        isFrozen={isFrozen}
        isOpen={isOpen}
        isClosing={isClosing}
        applyOpenStyles={applyOpenStyles}
        dropDirection={dropDirection}
        portalStyle={portalStyle}
        isPositionReady={isPositionReady}
        isKeyboardNavigation={isKeyboardNavigation}
        onMouseEnter={onMenuEnter}
        onMouseLeave={onMenuLeave}
      >
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
              id="dropdown-options-list"
              ref={optionsContainerRef}
              role="listbox"
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
                />
              )}
            </div>
          </MenuContent>
        </div>
      </MenuPortal>
    );
  }
);

DropdownMenu.displayName = 'DropdownMenu';

export default DropdownMenu;
