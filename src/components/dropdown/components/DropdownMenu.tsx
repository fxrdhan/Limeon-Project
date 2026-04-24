import { forwardRef, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import MenuPortal from "./menu/MenuPortal";
import MenuContent from "./menu/MenuContent";
import SearchBar from "./SearchBar";
import OptionItem from "./OptionItem";
import EmptyState from "./menu/EmptyState";
import { useDropdownContext } from "../hooks/useDropdownContext";
import type { DropdownMenuProps } from "../types";

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
      dropdownMenuRef,
      searchInputRef,
      optionsContainerRef,
      scrollState,
    } = useDropdownContext();
    const releaseHeldHighlightTimeoutRef = useRef<number | null>(null);
    const [heldHighlightFrame, setHeldHighlightFrame] = useState<{
      top: number;
      left: number;
      width: number;
      height: number;
    } | null>(null);

    useLayoutEffect(() => {
      if (pendingHighlightedIndex === null || !isKeyboardNavigation) return;

      const container = optionsContainerRef.current;
      const menuElement = dropdownMenuRef.current;
      const optionElements = container
        ? Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'))
        : [];
      const targetElement = optionElements[pendingHighlightedIndex];
      const sourceElement =
        pendingHighlightSourceIndex !== null
          ? optionElements[pendingHighlightSourceIndex]
          : highlightedIndex >= 0
            ? optionElements[highlightedIndex]
            : null;

      if (!container || !menuElement || !targetElement) return;

      const itemTop = targetElement.offsetTop;
      const itemBottom = itemTop + targetElement.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const visibilityInset = 4;
      let scrollTop: number | null = null;
      let scrollDirection: "up" | "down" | null = null;

      if (itemTop < containerScrollTop + visibilityInset) {
        scrollTop = Math.max(0, itemTop - visibilityInset);
        scrollDirection = "up";
      } else if (itemBottom > containerScrollTop + containerHeight - visibilityInset) {
        scrollTop =
          pendingHighlightedIndex === filteredOptions.length - 1
            ? container.scrollHeight - containerHeight
            : itemBottom - containerHeight + visibilityInset;
        scrollDirection = "down";
      }

      if (scrollTop !== null) {
        if (releaseHeldHighlightTimeoutRef.current !== null) {
          window.clearTimeout(releaseHeldHighlightTimeoutRef.current);
        }

        const sourceTop = sourceElement?.offsetTop ?? itemTop;
        const sourceBottom =
          sourceTop + (sourceElement?.offsetHeight ?? targetElement.offsetHeight);
        const sourceIsPinnedToEdge =
          scrollDirection === "up"
            ? sourceTop <= containerScrollTop + visibilityInset
            : sourceBottom >= containerScrollTop + containerHeight - visibilityInset;
        const frameElement = sourceIsPinnedToEdge
          ? (sourceElement ?? targetElement)
          : targetElement;
        const frameRect = frameElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const frameTop = sourceIsPinnedToEdge
          ? frameRect.top - menuRect.top
          : scrollDirection === "up"
            ? containerRect.top + visibilityInset - menuRect.top
            : containerRect.bottom - visibilityInset - targetElement.offsetHeight - menuRect.top;

        setHeldHighlightFrame({
          top: frameTop,
          left: frameRect.left - menuRect.left,
          width: frameRect.width,
          height: frameRect.height,
        });
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
        releaseHeldHighlightTimeoutRef.current = window.setTimeout(() => {
          setHeldHighlightFrame(null);
          releaseHeldHighlightTimeoutRef.current = null;
        }, 260);
      }
    }, [
      dropdownMenuRef,
      filteredOptions.length,
      highlightedIndex,
      isKeyboardNavigation,
      optionsContainerRef,
      pendingHighlightedIndex,
      pendingHighlightSourceIndex,
    ]);

    useLayoutEffect(() => {
      if (isKeyboardNavigation) return;
      if (releaseHeldHighlightTimeoutRef.current !== null) {
        window.clearTimeout(releaseHeldHighlightTimeoutRef.current);
        releaseHeldHighlightTimeoutRef.current = null;
      }
      setHeldHighlightFrame(null);
    }, [isKeyboardNavigation]);

    useEffect(() => {
      return () => {
        if (releaseHeldHighlightTimeoutRef.current !== null) {
          window.clearTimeout(releaseHeldHighlightTimeoutRef.current);
        }
      };
    }, []);

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
              onScroll={onScroll}
              onKeyDown={!searchList ? onKeyDown : undefined}
            >
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
                    suppressHighlightBackground={Boolean(heldHighlightFrame)}
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
