import { forwardRef, RefObject, useLayoutEffect, useState } from "react";
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
      searchInputRef,
      optionsContainerRef,
      scrollState,
    } = useDropdownContext();
    const highlightedOptionId = filteredOptions[highlightedIndex]?.id;
    const [highlightFrame, setHighlightFrame] = useState({
      top: 0,
      height: 0,
      isVisible: false,
      shouldAnimate: false,
    });

    useLayoutEffect(() => {
      const container = optionsContainerRef.current;
      if (!container || !highlightedOptionId) {
        setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
        return;
      }

      const optionElement = Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((element) => element.id === `dropdown-option-${highlightedOptionId}`);

      if (!optionElement) {
        setHighlightFrame((frame) => (frame.isVisible ? { ...frame, isVisible: false } : frame));
        return;
      }

      const updateHighlightFrame = () => {
        setHighlightFrame((currentFrame) => ({
          top: optionElement.offsetTop,
          height: optionElement.offsetHeight,
          isVisible: true,
          shouldAnimate: currentFrame.isVisible,
        }));
      };

      updateHighlightFrame();
      const animationFrameId = requestAnimationFrame(updateHighlightFrame);
      const resizeObserver =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHighlightFrame);
      resizeObserver?.observe(optionElement);

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver?.disconnect();
      };
    }, [highlightedOptionId, expandedId, filteredOptions.length, optionsContainerRef]);

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
        <div>
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
                className="pointer-events-none absolute left-1 right-1 top-0 z-0 rounded-lg bg-slate-100"
                initial={false}
                animate={{
                  opacity: highlightFrame.isVisible ? 1 : 0,
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
