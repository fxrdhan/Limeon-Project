import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TbSearch, TbSparkles } from "react-icons/tb";
import fuzzysort from "fuzzysort";
import { BaseSelectorProps } from "../../types";
import { SEARCH_CONSTANTS } from "../../constants";

// Helper to highlight matched characters
/* c8 ignore next */
const HighlightedText: React.FC<{
  text: string;
  indices: readonly number[] | null;
  theme?: "purple" | "blue" | "orange";
}> = ({ text, indices, theme = "purple" }) => {
  if (!indices || indices.length === 0) {
    return <>{text}</>;
  }

  const themeColor =
    theme === "blue" ? "text-blue-600" : theme === "orange" ? "text-orange-600" : "text-purple-600";

  const indexSet = new Set(indices);
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={i} className={indexSet.has(i) ? `font-bold ${themeColor}` : ""}>
          {char}
        </span>
      ))}
    </>
  );
};

function BaseSelector<T>({
  items,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm: externalSearchTerm = "",
  config,
  defaultSelectedIndex,
  onHighlightChange,
  contentKey,
  contentSlideDirection = 0,
  outsideClickIgnoreRef,
}: BaseSelectorProps<T>) {
  const [showHeader, setShowHeader] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const releaseHeldBackgroundTimeoutRef = useRef<number | null>(null);

  // Internal search term - captured from keystrokes when modal is open
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);
  const [heldBackgroundStyle, setHeldBackgroundStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Use internal search term (priority) or external search term
  const searchTerm = internalSearchTerm || externalSearchTerm;
  const activeContentKey = contentKey ?? config.headerText;
  const activeContentKeyRef = useRef(activeContentKey);
  activeContentKeyRef.current = activeContentKey;

  useLayoutEffect(() => {
    if (!isOpen) return;
    setInternalSearchTerm("");
    setHoveredIndex(null);
    setIsHoverDisabled(false);
    setHeldBackgroundStyle(null);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [activeContentKey, isOpen]);

  useEffect(() => {
    return () => {
      if (releaseHeldBackgroundTimeoutRef.current !== null) {
        window.clearTimeout(releaseHeldBackgroundTimeoutRef.current);
      }
    };
  }, []);

  const searchFieldsConfig = useMemo(() => {
    if (items.length === 0) return [];
    return config.getSearchFields(items[0]);
  }, [items, config]);

  // Store fuzzy search results with indices for highlighting
  const searchResults = useMemo(() => {
    if (searchTerm && items.length > 0) {
      const searchTargets = items.map((item) => {
        const searchFields = config.getSearchFields(item);
        return {
          item,
          ...searchFields.reduce((acc, field) => ({ ...acc, [field.key]: field.value }), {}),
        };
      });

      const allResults = new Map<
        string,
        { item: T; score: number; labelIndices: readonly number[] | null }
      >();

      // First pass: collect all matching items with scores
      searchFieldsConfig.forEach((fieldConfig) => {
        const results = fuzzysort.go(searchTerm, searchTargets, {
          key: fieldConfig.key,
          threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
        });

        results.forEach((result) => {
          const itemKey = config.getItemKey(result.obj.item);
          const boost = fieldConfig.boost || 0;
          const currentBest = allResults.get(itemKey);

          if (!currentBest || result.score + boost > currentBest.score) {
            allResults.set(itemKey, {
              item: result.obj.item,
              score: result.score + boost,
              labelIndices: null, // Will be computed below
            });
          }
        });
      });

      // Second pass: get label-specific indices for highlighting
      // This ensures we highlight the correct characters in the label text
      const labelTargets = Array.from(allResults.values()).map((r) => ({
        item: r.item,
        label: config.getItemLabel(r.item),
      }));

      const labelResults = fuzzysort.go(searchTerm, labelTargets, {
        key: "label",
        threshold: -Infinity, // Accept any match since item already qualified
      });

      labelResults.forEach((result) => {
        const itemKey = config.getItemKey(result.obj.item);
        const existing = allResults.get(itemKey);
        if (existing) {
          allResults.set(itemKey, {
            ...existing,
            labelIndices: result.indexes,
          });
        }
      });

      return Array.from(allResults.values()).sort((a, b) => b.score - a.score);
    } else {
      return items.map((item) => ({
        item,
        score: 0,
        labelIndices: null as readonly number[] | null,
      }));
    }
  }, [searchTerm, items, searchFieldsConfig, config]);

  // Derive filteredItems from searchResults
  const filteredItems = useMemo(() => searchResults.map((r) => r.item), [searchResults]);

  // Get highlight indices for an item's label
  const getHighlightIndices = useCallback(
    (item: T): readonly number[] | null => {
      const result = searchResults.find(
        (r) => config.getItemKey(r.item) === config.getItemKey(item),
      );
      return result?.labelIndices || null;
    },
    [searchResults, config],
  );

  // Use getDerivedStateFromProps pattern to manage selectedIndex resets
  const [indexState, setIndexState] = useState({
    isOpen: false,
    contentKey: activeContentKey,
    filteredLength: 0,
    selectedIndex: 0,
    lastDefaultIndex: defaultSelectedIndex,
  });

  if (
    isOpen !== indexState.isOpen ||
    activeContentKey !== indexState.contentKey ||
    filteredItems.length !== indexState.filteredLength
  ) {
    let newIndex = indexState.selectedIndex;

    // Reset to defaultSelectedIndex (or 0) when opening
    if (isOpen && (!indexState.isOpen || activeContentKey !== indexState.contentKey)) {
      newIndex = defaultSelectedIndex ?? 0;
    }
    // Adjust if out of bounds
    /* c8 ignore start */
    else if (filteredItems.length > 0 && indexState.selectedIndex >= filteredItems.length) {
      newIndex = Math.max(0, filteredItems.length - 1);
    } else if (filteredItems.length === 0) {
      newIndex = 0;
    }
    /* c8 ignore end */

    setIndexState({
      isOpen,
      contentKey: activeContentKey,
      filteredLength: filteredItems.length,
      selectedIndex: newIndex,
      lastDefaultIndex: defaultSelectedIndex,
    });
  }

  const selectedIndex = indexState.selectedIndex;
  const setSelectedIndex = (value: number | ((prev: number) => number)) => {
    setIndexState((prev) => ({
      ...prev,
      selectedIndex: typeof value === "function" ? value(prev.selectedIndex) : value,
    }));
  };
  const backgroundIndex = hoveredIndex ?? selectedIndex;
  const getBackgroundColorClass = () =>
    config.theme === "blue"
      ? "bg-blue-100"
      : config.theme === "orange"
        ? "bg-orange-100"
        : "bg-purple-100";

  const scrollKeyboardTargetIntoView = useCallback(
    (currentIndex: number, nextIndex: number): boolean => {
      const container = listContainerRef.current;
      const nextElement = itemRefs.current[nextIndex];
      const currentElement = itemRefs.current[currentIndex];
      const modalElement = modalRef.current;

      if (!container || !nextElement || !currentElement || !modalElement) return false;

      const containerRect = container.getBoundingClientRect();
      const nextRect = nextElement.getBoundingClientRect();
      const currentRect = currentElement.getBoundingClientRect();
      const modalRect = modalElement.getBoundingClientRect();
      const nextTop = nextRect.top - containerRect.top + container.scrollTop;
      const nextBottom = nextTop + nextRect.height;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const visibilityInset = 4;
      let scrollTop: number | null = null;

      if (nextTop < containerScrollTop + visibilityInset) {
        scrollTop = Math.max(0, nextTop - visibilityInset);
      } else if (nextBottom > containerScrollTop + containerHeight - visibilityInset) {
        scrollTop =
          nextIndex === filteredItems.length - 1
            ? container.scrollHeight - containerHeight
            : nextBottom - containerHeight + visibilityInset;
      }

      if (scrollTop === null) return false;

      if (releaseHeldBackgroundTimeoutRef.current !== null) {
        window.clearTimeout(releaseHeldBackgroundTimeoutRef.current);
      }

      setHeldBackgroundStyle({
        top: currentRect.top - modalRect.top,
        left: currentRect.left - modalRect.left,
        width: currentRect.width,
        height: currentRect.height,
      });
      container.scrollTo({ top: scrollTop, behavior: "smooth" });
      releaseHeldBackgroundTimeoutRef.current = window.setTimeout(() => {
        setHeldBackgroundStyle(null);
        releaseHeldBackgroundTimeoutRef.current = null;
      }, 180);

      return true;
    },
    [filteredItems.length],
  );

  // Reset internal search term when modal closes
  useEffect(() => {
    if (isOpen && !showHeader) {
      // Move all setState to async to avoid synchronous setState in effect
      setTimeout(() => {
        setShowHeader(true);
      }, 0);
      setTimeout(() => {
        setShowContent(true);
      }, 50); // Reduced from 200ms to 50ms
    } else if (!isOpen && (showHeader || showContent)) {
      // Move all setState to async
      setTimeout(() => {
        setShowContent(false);
      }, 0);
      setTimeout(() => {
        setShowHeader(false);
        // Reset internal search term
        setInternalSearchTerm("");
      }, 100); // Reduced from 200ms to 100ms
    }
  }, [isOpen, showHeader, showContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.defaultPrevented) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (filteredItems.length > 0) {
            setIsHoverDisabled(true);
            setHoveredIndex((prev) => {
              const baseIndex = prev ?? selectedIndex;
              const nextIndex = baseIndex + 1 >= filteredItems.length ? 0 : baseIndex + 1;
              if (nextIndex !== 0) {
                scrollKeyboardTargetIntoView(baseIndex, nextIndex);
              } else {
                if (releaseHeldBackgroundTimeoutRef.current !== null) {
                  window.clearTimeout(releaseHeldBackgroundTimeoutRef.current);
                  releaseHeldBackgroundTimeoutRef.current = null;
                }
                setHeldBackgroundStyle(null);
              }
              return nextIndex;
            });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (filteredItems.length > 0) {
            setIsHoverDisabled(true);
            setHoveredIndex((prev) => {
              const baseIndex = prev ?? selectedIndex;
              const nextIndex = baseIndex === 0 ? filteredItems.length - 1 : baseIndex - 1;
              if (nextIndex !== filteredItems.length - 1) {
                scrollKeyboardTargetIntoView(baseIndex, nextIndex);
              } else {
                if (releaseHeldBackgroundTimeoutRef.current !== null) {
                  window.clearTimeout(releaseHeldBackgroundTimeoutRef.current);
                  releaseHeldBackgroundTimeoutRef.current = null;
                }
                setHeldBackgroundStyle(null);
              }
              return nextIndex;
            });
          }
          break;
        case "Enter":
          e.preventDefault();
          if (
            filteredItems.length > 0 &&
            backgroundIndex >= 0 &&
            backgroundIndex < filteredItems.length &&
            filteredItems[backgroundIndex]
          ) {
            onSelect(filteredItems[backgroundIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Backspace":
          e.preventDefault();
          setInternalSearchTerm((prev) => prev.slice(0, -1));
          setHoveredIndex(null);
          setIsHoverDisabled(false);
          setHeldBackgroundStyle(null);
          // Reset to first item when search changes
          setSelectedIndex(0);
          break;
        default:
          // Capture alphanumeric and space for search
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            // Skip space if search term is empty (prevents accidental search when SPACE opens selector)
            if (e.key === " " && internalSearchTerm === "") {
              return;
            }
            setInternalSearchTerm((prev) => prev + e.key);
            setHoveredIndex(null);
            setIsHoverDisabled(false);
            setHeldBackgroundStyle(null);
            // Reset to first item when search changes
            setSelectedIndex(0);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    filteredItems,
    backgroundIndex,
    selectedIndex,
    scrollKeyboardTargetIntoView,
    onSelect,
    onClose,
    internalSearchTerm,
  ]);

  useEffect(() => {
    if (!isOpen || !showContent) return;

    const scrollActiveBackgroundItemIntoView = () => {
      const container = listContainerRef.current;
      const selectedElement = itemRefs.current[backgroundIndex];

      if (!container || !selectedElement) return;

      const isLastItem = backgroundIndex === filteredItems.length - 1;
      const containerRect = container.getBoundingClientRect();
      const itemRect = selectedElement.getBoundingClientRect();

      const itemTop = itemRect.top - containerRect.top + container.scrollTop;
      const itemBottom = itemTop + itemRect.height;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const visibilityInset = 4;

      // Check if item is above visible area
      /* c8 ignore start */
      if (itemTop < containerScrollTop + visibilityInset) {
        container.scrollTo({
          top: Math.max(0, itemTop - visibilityInset),
          behavior: "smooth",
        });
      }
      // Check if item is below visible area
      else if (itemBottom > containerScrollTop + containerHeight - visibilityInset) {
        // If it's the last item, scroll to absolute bottom
        if (isLastItem) {
          container.scrollTo({
            top: container.scrollHeight - containerHeight,
            behavior: "smooth",
          });
        } else {
          container.scrollTo({
            top: itemBottom - containerHeight + visibilityInset,
            behavior: "smooth",
          });
        }
      }
      /* c8 ignore end */
    };

    const frameIds: number[] = [];
    const scheduleScroll = (remainingFrames: number) => {
      const frameId = requestAnimationFrame(() => {
        scrollActiveBackgroundItemIntoView();
        if (remainingFrames > 0) {
          scheduleScroll(remainingFrames - 1);
        }
      });
      frameIds.push(frameId);
    };

    scheduleScroll(2);
    return () => {
      frameIds.forEach((frameId) => cancelAnimationFrame(frameId));
    };
  }, [activeContentKey, backgroundIndex, isOpen, filteredItems, showContent]);

  // Notify parent of highlighted item changes for live preview
  useEffect(() => {
    if (isOpen && onHighlightChange) {
      const highlightedItem =
        filteredItems.length > 0 && selectedIndex < filteredItems.length
          ? filteredItems[selectedIndex]
          : null;
      onHighlightChange(highlightedItem);
    }
  }, [isOpen, selectedIndex, filteredItems, onHighlightChange]);

  // Clear highlight when modal closes
  useEffect(() => {
    if (!isOpen && onHighlightChange) {
      onHighlightChange(null);
    }
  }, [isOpen, onHighlightChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        modalRef.current &&
        !modalRef.current.contains(target) &&
        !outsideClickIgnoreRef?.current?.contains(target)
      ) {
        if (isOpen) {
          // Just call onClose, let the useEffect handle the animation
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, outsideClickIgnoreRef]);

  // Determine header content
  const headerContent = useMemo(() => {
    if (internalSearchTerm) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <TbSearch className="w-3 h-3" />
          <span>
            Searching:{" "}
            <span
              className={`font-medium ${
                config.theme === "blue"
                  ? "text-blue-600"
                  : config.theme === "orange"
                    ? "text-orange-600"
                    : "text-purple-600"
              }`}
            >
              {internalSearchTerm}
            </span>
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <TbSparkles className="w-3 h-3" />
        <span>{config.headerText}</span>
      </div>
    );
  }, [internalSearchTerm, config.headerText, config.theme]);

  const contentSlideDistance = contentSlideDirection * 24;
  const modalPosition = {
    x: position.left,
    y: position.top + 5,
  };
  const modalPositionTransition = {
    type: "spring",
    stiffness: 520,
    damping: 42,
    mass: 0.7,
  } as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          layout
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[180px] overflow-hidden"
          style={{
            top: 0,
            left: 0,
          }}
          initial={{
            opacity: 0,
            scale: 0.95,
            x: modalPosition.x,
            y: modalPosition.y,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            x: modalPosition.x,
            y: modalPosition.y,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            opacity: { duration: 0.15 },
            scale: { duration: 0.15 },
            x: modalPositionTransition,
            y: modalPositionTransition,
            layout: {
              duration: 0.18,
              ease: "easeOut",
            },
          }}
        >
          {heldBackgroundStyle && (
            <motion.div
              className={`absolute z-0 rounded-lg pointer-events-none ${getBackgroundColorClass()}`}
              style={heldBackgroundStyle}
              initial={false}
              animate={heldBackgroundStyle}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8,
              }}
            />
          )}
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={activeContentKey}
              className="overflow-hidden relative z-10"
              initial={{
                opacity: contentSlideDirection === 0 ? 1 : 0,
                x: contentSlideDistance,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: contentSlideDirection === 0 ? 1 : 0,
                x: -contentSlideDistance,
              }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <AnimatePresence>
                {showHeader && (
                  <>
                    <motion.div
                      className="shrink-0 bg-white border-b border-slate-100 px-3 py-2 rounded-t-lg"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      {headerContent}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showContent && (
                  <motion.div
                    className="overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.1,
                      ease: "easeOut",
                    }}
                  >
                    <div
                      ref={(element) => {
                        if (activeContentKey === activeContentKeyRef.current) {
                          listContainerRef.current = element;
                        }
                      }}
                      className="max-h-65 overflow-y-auto overflow-x-hidden py-1"
                      onMouseLeave={() => {
                        setHoveredIndex(null);
                        setIsHoverDisabled(false);
                      }}
                    >
                      {filteredItems.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-500 text-center">
                          {internalSearchTerm
                            ? `No results for "${internalSearchTerm}"`
                            : config.noResultsText.replace("{searchTerm}", searchTerm)}
                        </div>
                      ) : (
                        <div className="relative isolate">
                          {/* Items */}
                          {filteredItems.map((item, index) => {
                            const isSelected = index === selectedIndex;
                            const hasBackground = index === backgroundIndex;
                            const highlightIndices = getHighlightIndices(item);
                            const selectedTextClass =
                              config.theme === "blue"
                                ? "text-blue-700"
                                : config.theme === "orange"
                                  ? "text-orange-700"
                                  : "text-purple-700";

                            return (
                              <div
                                key={config.getItemKey(item)}
                                ref={(el) => {
                                  if (activeContentKey === activeContentKeyRef.current) {
                                    itemRefs.current[index] = el;
                                  }
                                }}
                                className="px-3 py-2 cursor-pointer flex items-center gap-3 mx-1 rounded-lg relative transition-colors duration-150"
                                onClick={() => onSelect(item)}
                                onMouseEnter={() => {
                                  if (!isHoverDisabled) {
                                    setHoveredIndex(index);
                                  }
                                }}
                                onMouseMove={() => {
                                  if (isHoverDisabled) {
                                    setIsHoverDisabled(false);
                                    setHeldBackgroundStyle(null);
                                    setHoveredIndex(index);
                                  }
                                }}
                                role="button"
                              >
                                {hasBackground && !heldBackgroundStyle && (
                                  <motion.div
                                    layoutId="base-selector-active-background"
                                    className={`absolute inset-0 z-0 rounded-lg pointer-events-none ${getBackgroundColorClass()}`}
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 30,
                                      mass: 0.8,
                                    }}
                                  />
                                )}
                                <div
                                  className={`shrink-0 relative z-10 transition-colors duration-150 ${
                                    isSelected
                                      ? config.getItemActiveColor?.(item) || "text-slate-900"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {config.getItemIcon(item)}
                                </div>
                                <div className="flex-1 min-w-0 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-medium transition-colors duration-150 ${
                                        isSelected ? selectedTextClass : "text-slate-700"
                                      }`}
                                    >
                                      <HighlightedText
                                        text={config.getItemLabel(item)}
                                        indices={highlightIndices}
                                        theme={config.theme}
                                      />
                                    </span>
                                    {config.getItemSecondaryText && (
                                      <span className="text-xs text-slate-400">
                                        {config.getItemSecondaryText(item)}
                                      </span>
                                    )}
                                  </div>
                                  {config.getItemDescription && config.getItemDescription(item) && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                      {config.getItemDescription(item)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BaseSelector;
