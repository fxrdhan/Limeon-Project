import { forwardRef, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import MenuPortal from "./menu/MenuPortal";
import MenuContent from "./menu/MenuContent";
import SearchBar from "./SearchBar";
import OptionItem from "./OptionItem";
import EmptyState from "./menu/EmptyState";
import { useDropdownContext } from "../hooks/useDropdownContext";
import type { DropdownMenuProps } from "../types";
import { DROPDOWN_CONSTANTS } from "../constants";
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
  hasKeyboardScrollTargetSettled,
  isWrappedKeyboardScroll,
  type KeyboardPinnedHighlightFrame,
} from "@/components/shared/keyboard-pinned-highlight";

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
    const [heldHighlightFrame, setHeldHighlightFrame] =
      useState<KeyboardPinnedHighlightFrame | null>(null);
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
              currentContainer?.querySelectorAll<HTMLElement>('[role="option"]')[
                pendingHighlightedIndex
              ];

            if (!currentContainer || !currentTargetElement) {
              setHeldHighlightFrame(null);
              releaseHeldHighlightFrameRef.current = null;
              return;
            }

            const hasHeldLongEnough =
              window.performance.now() - startedAt >=
              DROPDOWN_CONSTANTS.KEYBOARD_SCROLL_HIGHLIGHT_MAX_HOLD;

            if (
              hasKeyboardScrollTargetSettled({
                container: currentContainer,
                scrollTop: scrollTarget.scrollTop,
                targetElement: currentTargetElement,
              }) ||
              hasHeldLongEnough
            ) {
              setHeldHighlightFrame(null);
              releaseHeldHighlightFrameRef.current = null;
              return;
            }

            releaseHeldHighlightFrameRef.current = window.requestAnimationFrame(checkTarget);
          };

          releaseHeldHighlightFrameRef.current = window.requestAnimationFrame(checkTarget);
        };

        if (
          isWrappedKeyboardScroll({
            itemCount: filteredOptions.length,
            sourceIndex: pendingHighlightSourceIndex,
            targetIndex: pendingHighlightedIndex,
          })
        ) {
          setHeldHighlightFrame(
            getKeyboardPinnedHighlightFrame({
              container,
              forceTargetEdgeFrame: true,
              frameRootElement: menuElement,
              scrollDirection: scrollTarget.direction,
              targetElement,
            }),
          );
          container.scrollTo({
            top: scrollTarget.scrollTop,
            behavior: "smooth",
          });
          releaseHeldHighlightWhenTargetSettles();
          return;
        }

        setHeldHighlightFrame(
          getKeyboardPinnedHighlightFrame({
            container,
            frameRootElement: menuElement,
            scrollDirection: scrollTarget.direction,
            sourceElement,
            targetElement,
          }),
        );
        container.scrollTo({ top: scrollTarget.scrollTop, behavior: "smooth" });
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

      if (heldHighlightFrame) {
        onHoverDetailHide?.();
        return;
      }

      const frameId = window.requestAnimationFrame(() => {
        const container = optionsContainerRef.current;
        const highlightedOption = filteredOptions[highlightedIndex];
        const highlightedElement =
          container?.querySelectorAll<HTMLElement>('[role="option"]')[highlightedIndex];

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
          { immediate: true },
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
