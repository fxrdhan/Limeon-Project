import { forwardRef, RefObject, useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import MenuPortal from "./menu/MenuPortal";
import MenuContent from "./menu/MenuContent";
import SearchBar from "./SearchBar";
import OptionItem from "./OptionItem";
import EmptyState from "./menu/EmptyState";
import { useDropdownContext } from "../hooks/useDropdownContext";
import type { DropdownMenuProps } from "../types";

const highlightTransition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;

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
      dropdownMenuRef,
      searchInputRef,
      optionsContainerRef,
      scrollState,
    } = useDropdownContext();
    const highlightedOptionId = filteredOptions[highlightedIndex]?.id;
    const previousHighlightedIndexRef = useRef<number | null>(null);
    const releaseHeldHighlightTimeoutRef = useRef<number | null>(null);
    const heldHighlightFrameRef = useRef<{
      top: number;
      left: number;
      width: number;
      height: number;
    } | null>(null);
    const [highlightFrame, setHighlightFrame] = useState({
      top: 0,
      height: 0,
      isVisible: false,
      shouldAnimate: false,
    });
    const [heldHighlightFrame, setHeldHighlightFrame] = useState<{
      top: number;
      left: number;
      width: number;
      height: number;
    } | null>(null);
    const updateHeldHighlightFrame = useCallback(
      (
        frame: {
          top: number;
          left: number;
          width: number;
          height: number;
        } | null,
      ) => {
        heldHighlightFrameRef.current = frame;
        setHeldHighlightFrame(frame);
      },
      [],
    );

    useLayoutEffect(() => {
      if (pendingHighlightedIndex === null || !isKeyboardNavigation) return;

      const container = optionsContainerRef.current;
      const menuElement = dropdownMenuRef.current;
      const optionElements = container
        ? Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'))
        : [];
      const targetElement = optionElements[pendingHighlightedIndex];
      const previousHighlightedIndex = previousHighlightedIndexRef.current;
      const currentElement =
        previousHighlightedIndex !== null
          ? optionElements[previousHighlightedIndex]
          : highlightedIndex >= 0
            ? optionElements[highlightedIndex]
            : targetElement;

      if (!container || !menuElement || !targetElement || !currentElement) return;

      if (releaseHeldHighlightTimeoutRef.current !== null) {
        window.clearTimeout(releaseHeldHighlightTimeoutRef.current);
        releaseHeldHighlightTimeoutRef.current = null;
      }

      if (!heldHighlightFrameRef.current) {
        const currentRect = currentElement.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        updateHeldHighlightFrame({
          top: currentRect.top - menuRect.top,
          left: currentRect.left - menuRect.left,
          width: currentRect.width,
          height: currentRect.height,
        });
      }

      const itemTop = targetElement.offsetTop;
      const itemBottom = itemTop + targetElement.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const visibilityInset = 4;
      let scrollTop: number | null = null;

      if (itemTop < containerScrollTop + visibilityInset) {
        scrollTop = Math.max(0, itemTop - visibilityInset);
      } else if (itemBottom > containerScrollTop + containerHeight - visibilityInset) {
        scrollTop =
          pendingHighlightedIndex === filteredOptions.length - 1
            ? container.scrollHeight - containerHeight
            : itemBottom - containerHeight + visibilityInset;
      }

      if (scrollTop !== null) {
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
      }
    }, [
      dropdownMenuRef,
      filteredOptions.length,
      highlightedIndex,
      isKeyboardNavigation,
      optionsContainerRef,
      pendingHighlightedIndex,
      updateHeldHighlightFrame,
    ]);

    useLayoutEffect(() => {
      const container = optionsContainerRef.current;
      if (!container || !highlightedOptionId) {
        previousHighlightedIndexRef.current = highlightedIndex >= 0 ? highlightedIndex : null;
        setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
        return;
      }

      const optionElement = Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((element) => element.id === `dropdown-option-${highlightedOptionId}`);

      if (!optionElement) {
        previousHighlightedIndexRef.current = highlightedIndex >= 0 ? highlightedIndex : null;
        setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
        return;
      }

      const updateHighlightFrame = (shouldAnimateOverride?: boolean) => {
        setHighlightFrame((currentFrame) => ({
          top: optionElement.offsetTop,
          height: optionElement.offsetHeight,
          isVisible: true,
          shouldAnimate: shouldAnimateOverride ?? currentFrame.isVisible,
        }));
      };

      if (pendingHighlightedIndex !== null) {
        updateHighlightFrame(false);
        return;
      }

      previousHighlightedIndexRef.current = highlightedIndex >= 0 ? highlightedIndex : null;

      if (releaseHeldHighlightTimeoutRef.current !== null) {
        window.clearTimeout(releaseHeldHighlightTimeoutRef.current);
        releaseHeldHighlightTimeoutRef.current = null;
      }
      updateHeldHighlightFrame(null);
      updateHighlightFrame();
      const animationFrameId = requestAnimationFrame(() => {
        updateHighlightFrame();
      });
      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              updateHighlightFrame();
            });
      resizeObserver?.observe(optionElement);

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver?.disconnect();
      };
    }, [
      highlightedOptionId,
      expandedId,
      filteredOptions.length,
      highlightedIndex,
      highlightFrame.isVisible,
      isKeyboardNavigation,
      dropdownMenuRef,
      optionsContainerRef,
      pendingHighlightedIndex,
      updateHeldHighlightFrame,
    ]);

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
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
              style={heldHighlightFrame}
              initial={false}
              animate={heldHighlightFrame}
              transition={highlightTransition}
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
              onScroll={onScroll}
              onKeyDown={!searchList ? onKeyDown : undefined}
            >
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1 right-1 top-0 z-0 rounded-lg bg-primary/10"
                initial={false}
                animate={{
                  opacity: highlightFrame.isVisible && !heldHighlightFrame ? 1 : 0,
                  y: highlightFrame.top,
                  height: highlightFrame.height,
                }}
                transition={highlightFrame.shouldAnimate ? highlightTransition : { duration: 0 }}
              />
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <OptionItem
                    key={option.id}
                    option={option}
                    index={index}
                    isSelected={Boolean(
                      withCheckbox && Array.isArray(value)
                        ? value.includes(option.id)
                        : option.id === value,
                    )}
                    isHighlighted={highlightedIndex === index}
                    isExpanded={expandedId === option.id}
                    onHighlight={(index) => {
                      onSetIsKeyboardNavigation(false);
                      onSetHighlightedIndex(index);
                    }}
                    dropdownMenuRef={ref as RefObject<HTMLDivElement>}
                  />
                ))
              ) : (
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
  },
);

DropdownMenu.displayName = "DropdownMenu";

export default DropdownMenu;
