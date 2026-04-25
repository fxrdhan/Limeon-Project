import { forwardRef, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import MenuPortal from "./menu/MenuPortal";
import MenuContent from "./menu/MenuContent";
import SearchBar from "./SearchBar";
import OptionItem from "./OptionItem";
import EmptyState from "./menu/EmptyState";
import { useDropdownContext } from "../hooks/useDropdownContext";
import type { DropdownMenuProps } from "../types";
import { DROPDOWN_CONSTANTS } from "../constants";

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
      dropdownMenuRef,
      searchInputRef,
      optionsContainerRef,
      scrollState,
    } = useDropdownContext();
    const [heldHighlightFrame, setHeldHighlightFrame] = useState<{
      top: number;
      left: number;
      width: number;
      height: number;
    } | null>(null);
    const releaseHeldHighlightFrameRef = useRef<number | null>(null);

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
        if (releaseHeldHighlightFrameRef.current !== null) {
          window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
        }

        const releaseHeldHighlightWhenTargetSettles = () => {
          const startedAt = window.performance.now();

          const checkTarget = () => {
            const currentContainer = optionsContainerRef.current;
            const currentTargetElement =
              currentContainer?.querySelectorAll<HTMLElement>('[role="option"]')[
                pendingHighlightedIndex
              ];

            if (!currentContainer || !currentTargetElement) {
              setHeldHighlightFrame(null);
              releaseHeldHighlightFrameRef.current = null;
              return;
            }

            const currentScrollTop = currentContainer.scrollTop;
            const currentTargetTop = currentTargetElement.offsetTop;
            const currentTargetBottom = currentTargetTop + currentTargetElement.offsetHeight;
            const currentTargetIsVisible =
              currentTargetTop >= currentScrollTop &&
              currentTargetBottom <= currentScrollTop + currentContainer.clientHeight;
            const hasReachedScrollTarget = Math.abs(currentContainer.scrollTop - scrollTop) <= 1;
            const hasHeldLongEnough =
              window.performance.now() - startedAt >=
              DROPDOWN_CONSTANTS.KEYBOARD_SCROLL_HIGHLIGHT_MAX_HOLD;

            if ((currentTargetIsVisible && hasReachedScrollTarget) || hasHeldLongEnough) {
              setHeldHighlightFrame(null);
              releaseHeldHighlightFrameRef.current = null;
              return;
            }

            releaseHeldHighlightFrameRef.current = window.requestAnimationFrame(checkTarget);
          };

          releaseHeldHighlightFrameRef.current = window.requestAnimationFrame(checkTarget);
        };

        const lastOptionIndex = filteredOptions.length - 1;
        const isWrappedLongScroll =
          pendingHighlightSourceIndex !== null &&
          lastOptionIndex > 0 &&
          ((pendingHighlightSourceIndex === lastOptionIndex && pendingHighlightedIndex === 0) ||
            (pendingHighlightSourceIndex === 0 && pendingHighlightedIndex === lastOptionIndex));

        if (isWrappedLongScroll) {
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const menuRect = menuElement.getBoundingClientRect();
          const edgeFrameTop =
            scrollDirection === "up"
              ? containerRect.top + visibilityInset - menuRect.top
              : containerRect.bottom - visibilityInset - targetElement.offsetHeight - menuRect.top;

          setHeldHighlightFrame({
            top: edgeFrameTop,
            left: targetRect.left - menuRect.left,
            width: targetRect.width,
            height: targetRect.height,
          });
          container.scrollTo({ top: scrollTop, behavior: "smooth" });
          releaseHeldHighlightWhenTargetSettles();
          return;
        }

        const sourceTop = sourceElement?.offsetTop ?? itemTop;
        const sourceBottom =
          sourceTop + (sourceElement?.offsetHeight ?? targetElement.offsetHeight);
        const sourceIsVisible =
          sourceElement !== null &&
          sourceBottom > containerScrollTop + visibilityInset &&
          sourceTop < containerScrollTop + containerHeight - visibilityInset;
        const sourceIsPinnedToEdge =
          sourceIsVisible &&
          (scrollDirection === "up"
            ? sourceTop <= containerScrollTop + visibilityInset
            : sourceBottom >= containerScrollTop + containerHeight - visibilityInset);
        const frameElement = sourceIsPinnedToEdge
          ? (sourceElement ?? targetElement)
          : targetElement;
        const frameRect = frameElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const edgeFrameTop =
          scrollDirection === "up"
            ? containerRect.top + visibilityInset - menuRect.top
            : containerRect.bottom - visibilityInset - targetElement.offsetHeight - menuRect.top;
        const sourceFrameTop = frameRect.top - menuRect.top;
        const frameTop = sourceIsPinnedToEdge
          ? scrollDirection === "up"
            ? Math.max(sourceFrameTop, edgeFrameTop)
            : Math.min(sourceFrameTop, edgeFrameTop)
          : edgeFrameTop;

        setHeldHighlightFrame({
          top: frameTop,
          left: frameRect.left - menuRect.left,
          width: frameRect.width,
          height: frameRect.height,
        });
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
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
    ]);

    useLayoutEffect(() => {
      if (isKeyboardNavigation) return;
      if (releaseHeldHighlightFrameRef.current !== null) {
        window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
        releaseHeldHighlightFrameRef.current = null;
      }
      setHeldHighlightFrame(null);
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

      if (!isOpen || !applyOpenStyles || !isPositionReady || highlightedIndex < 0) {
        onHoverDetailHide?.();
        return;
      }

      if (!isKeyboardNavigation) return;

      const frameId = window.requestAnimationFrame(() => {
        const container = optionsContainerRef.current;
        const highlightedOption = filteredOptions[highlightedIndex];
        const highlightedElement =
          container?.querySelectorAll<HTMLElement>('[role="option"]')[highlightedIndex];

        if (!highlightedOption || !highlightedElement) {
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
          { immediate: true },
        );
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [
      applyOpenStyles,
      filteredOptions,
      highlightedIndex,
      isKeyboardNavigation,
      isOpen,
      isPositionReady,
      onHoverDetailHide,
      onHoverDetailShow,
      optionsContainerRef,
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
